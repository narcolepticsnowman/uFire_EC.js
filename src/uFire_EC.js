const struct = require( 'python-struct' )
const C = require( './constants' )
const { openSync } = require( 'i2c-bus' )
let i2c = {}

const sleep = ( ms ) => new Promise( res => setTimeout( res, ms ) )

function getBus( busNumber ) {
    if( i2c[ busNumber ] ) {
        return i2c[ busNumber ]
    }
    return i2c[ busNumber ] = openSync( busNumber )
}

const padByte = value => value.length === 2 ? value : '0' + value
const toHexByte = value => padByte( Number( value ).toString( 16 ) )

module.exports = class uFire_EC {

    //Should use software bus!
    //See https://www.ufire.co/docs/uFire_ISE///raspberry-pi
    //and https://github.com/fivdi/i2c-bus/blob/master/doc/raspberry-pi-software-i2c.md
    constructor( address = C.EC_SALINITY, busNumber = 3 ) {
        this.s = 0
        this.mS = 0
        this.uS = 0
        this.raw = 0
        this.PPM_500 = 0
        this.PPM_640 = 0
        this.PPM_700 = 0
        this.salinityPSU = 0
        this.tempC = 0
        this.tempF = 0
        this.address = address
        this.tempCoefEC = 0.019
        this.tempCoefSalinity = 0.021
        this.blocking = true
        this.i2c = getBus( busNumber )
        console.log( 'I2c', this.i2c )
    }

    async measure() {
        await this.sendCommand( C.EC_MEASURE_EC )
        if( this.blocking ) {
            await sleep( C.EC_EC_MEASUREMENT_TIME / 1000.0 )
            await this.updateRegisters()
        }
        return this.mS
    }

    async measureEC( temp = 25, temp_constant = null ) {
        if( temp ) {
            await this.useTemperatureCompensation( true )
            await this.setTemp( temp )
        }
        if( temp_constant )
            await this.setTempConstant( temp_constant )

        await this.measure()

        return this.mS
    }

    async measureTemp() {
        await this.sendCommand( C.EC_MEASURE_TEMP )
        if( this.blocking ) {
            await sleep( C.EC_TEMP_MEASURE_TIME / 1000.0 )
            await this.updateRegisters()
        } else
            await this.updateRegisters()
        return this.tempC
    }

    // calibration
    async calibrateProbe( solutionEC, tempC = 25 ) {
        solutionEC = await this.mS_to_mS25( solutionEC, tempC )
        await this.writeRegister( C.EC_SOLUTION_REGISTER, solutionEC )
        await this.sendCommand( C.EC_CALIBRATE_PROBE )
        if( this.blocking )
            await sleep( C.EC_EC_MEASUREMENT_TIME / 1000.0 )
    }

    async calibrateProbeLow( solutionEC, tempC = 25 ) {
        solutionEC = this.mS_to_mS25( solutionEC, tempC )
        await this.writeRegister( C.EC_SOLUTION_REGISTER, solutionEC )
        await this.sendCommand( C.EC_CALIBRATE_LOW )
        if( this.blocking )
            await sleep( C.EC_EC_MEASUREMENT_TIME / 1000.0 )
    }

    async calibrateProbeHigh( solutionEC, tempC = 25 ) {
        solutionEC = this.mS_to_mS25( solutionEC, tempC )
        await this.writeRegister( C.EC_SOLUTION_REGISTER, parseFloat( solutionEC ) )
        await this.sendCommand( C.EC_CALIBRATE_HIGH )
        if( this.blocking )
            await sleep( C.EC_EC_MEASUREMENT_TIME / 1000.0 )

        return await this.getCalibrateHighReading()
    }

    async getCalibrateOffset() {
        return await this.readRegister( C.EC_CALIBRATE_OFFSET_REGISTER )
    }

    async getCalibrateHighReference() {
        return await this.readRegister( C.EC_CALIBRATE_REFHIGH_REGISTER )
    }

    async getCalibrateLowReference() {
        return await this.readRegister( C.EC_CALIBRATE_REFLOW_REGISTER )
    }

    async getCalibrateHighReading() {
        return await this.readRegister( C.EC_CALIBRATE_READHIGH_REGISTER )
    }

    async getCalibrateLowReading() {
        return await this.readRegister( C.EC_CALIBRATE_READLOW_REGISTER )
    }

    async setCalibrateOffset( offset ) {
        await this.writeRegister( C.EC_CALIBRATE_OFFSET_REGISTER, offset )
    }

    async setDualPointCalibration( refLow, refHigh, readLow, readHigh ) {
        await this.writeRegister( C.EC_CALIBRATE_REFLOW_REGISTER, refLow )
        await this.writeRegister( C.EC_CALIBRATE_REFHIGH_REGISTER, refHigh )
        await this.writeRegister( C.EC_CALIBRATE_READLOW_REGISTER, readLow )
        await this.writeRegister( C.EC_CALIBRATE_READHIGH_REGISTER, readHigh )
    }

    // temperature
    async mS_to_mS25( mS, tempC ) {
        return mS / ( 1 - ( await this.getTempCoefficient() * ( tempC - 25 ) ) )
    }

    async setTemp( tempC ) {
        await this.writeRegister( C.EC_TEMP_REGISTER, tempC )
        this.tempC = tempC
        this.tempF = this.toF( tempC )
    }

    async setTempConstant( b ) {
        await this.writeRegister( C.EC_TEMP_COMPENSATION_REGISTER, b )
    }

    async getTempConstant() {
        return await this.readRegister( C.EC_TEMP_COMPENSATION_REGISTER )
    }

    async setTempCoefficient( tempCoef ) {
        await this.writeRegister( C.EC_TEMPCOEF_REGISTER, tempCoef )
    }

    async getTempCoefficient() {
        return await this.readRegister( C.EC_TEMPCOEF_REGISTER )
    }

    async useTemperatureCompensation( b ) {
        let retVal = await this.readByte( C.EC_CONFIG_REGISTER )
        retVal = this.bitSet( retVal, C.EC_TEMP_COMPENSATION_CONFIG_BIT, b )
        await this.writeByte( C.EC_CONFIG_REGISTER, retVal )
    }

    // utilities
    async getVersion() {
        return await this.readByte( C.EC_VERSION_REGISTER )
    }

    async getFirmware() {
        return this.readByte( C.EC_FW_VERSION_REGISTER )
    }

    async reset() {
        await this.writeRegister( C.EC_CALIBRATE_OFFSET_REGISTER, NaN )
        await this.writeRegister( C.EC_CALIBRATE_REFHIGH_REGISTER, NaN )
        await this.writeRegister( C.EC_CALIBRATE_REFLOW_REGISTER, NaN )
        await this.writeRegister( C.EC_CALIBRATE_READHIGH_REGISTER, NaN )
        await this.writeRegister( C.EC_CALIBRATE_READLOW_REGISTER, NaN )
        await this.setTempConstant( 25 )
        await this.setTempCoefficient( 0.019 )
        await this.useTemperatureCompensation( false )
    }

    async setI2CAddress( i2cAddress ) {
        if( i2cAddress >= 1 && i2cAddress <= 127 ) {
            await this.writeRegister( C.EC_SOLUTION_REGISTER, parseFloat( i2cAddress ) )
            await this.sendCommand( C.EC_I2C )
            this.address = parseInt( i2cAddress )
        }
    }

    async connected() {
        return ( await this.readByte( C.EC_VERSION_REGISTER ) ) != 0xFF
    }

    async readEEPROM( address ) {
        await this.writeRegister( C.EC_SOLUTION_REGISTER, parseInt( address ) )
        await this.sendCommand( C.EC_READ )
        return await this.readRegister( C.EC_BUFFER_REGISTER )
    }

    async writeEEPROM( address, val ) {
        await this.writeRegister( C.EC_SOLUTION_REGISTER, parseInt( address ) )
        await this.writeRegister( C.EC_BUFFER_REGISTER, parseFloat( val ) )
        await this.sendCommand( C.EC_WRITE )
    }

    setBlocking( blocking ) {
        this.blocking = blocking == 1
    }

    getBlocking() {
        return !!this.blocking
    }

    async readData() {
        await this.updateRegisters()
        await this.getCalibrateHighReading()
        await this.getCalibrateHighReference()
        await this.getCalibrateLowReading()
        await this.getCalibrateLowReference()
        await this.getCalibrateOffset()
    }

    bitSet( v, index, x ) {
        let mask = 1 << index
        v &= ~mask
        if( x )
            v |= mask
        return v
    }

    async updateRegisters() {
        this.raw = await this.readRegister( C.EC_RAW_REGISTER )

        if( this.raw === 0 )
            this.mS = Infinity
        else
            this.mS = await this.readRegister( C.EC_MS_REGISTER )

        if( !Number.isFinite( this.mS ) ) {
            this.PPM_500 = this.mS * 500
            this.PPM_640 = this.mS * 640
            this.PPM_700 = this.mS * 700
            this.uS = this.mS * 1000
            this.S = this.mS / 1000

            this.salinityPSU = await this.readRegister( C.EC_SALINITY_PSU )
        } else {
            this.mS = -1
            this.PPM_500 = -1
            this.PPM_640 = -1
            this.PPM_700 = -1
            this.uS = -1
            this.S = -1
            this.salinityPSU = -1
        }
        this.tempC = await this.readRegister( C.EC_TEMP_REGISTER )

        if( this.tempC === -127.0 )
            this.tempF = -127.0
        else
            this.tempF =this.toF( this.tempC )
    }

    async changeRegister( r ) {
        await this.i2c.sendByteSync( this.address, r )
        await sleep( 10 )
    }


    async sendCommand( command ) {
        await this.i2c.writeByteSync( this.address, C.EC_TASK_REGISTER, command )
        await sleep( 10 )
    }

    async writeRegister( register, f ) {
        let n = this.roundTotalDigits( f )
        let data = struct.pack( 'f', n )
        await this.changeRegister( register )
        await this.i2c.writeI2cBlockSync( this.address, register, data.length, data )
        await sleep( 10 )
    }

    async readRegister( register ) {
        await this.changeRegister( register )

        let received = [
            toHexByte( this.i2c.receiveByteSync( this.address ) ),
            toHexByte( this.i2c.receiveByteSync( this.address ) ),
            toHexByte( this.i2c.receiveByteSync( this.address ) ),
            toHexByte( this.i2c.receiveByteSync( this.address ) )
        ].join( '' )

        let data = Buffer.from( received, 'hex' )
        let f = struct.unpack( 'f', data )[ 0 ]
        return this.roundTotalDigits( f )
    }

    async writeByte( register, value ) {
        this.i2c.writeByteSync( this.address, register, value )
        await sleep( 10 )
    }

    async readByte( register ) {
        await this.changeRegister( register )
        await sleep( 10 )
        return this.i2c.receiveByteSync( this.address )
    }

    magnitude( x ) {
        if( !isFinite( x ) )
            return 0
        return x === 0 ? 0 : Math.trunc( Math.floor( Math.log10( Math.abs( x ) ) ) ) + 1
    }

    roundTotalDigits( x, digits = 7 ) {
        digits -= this.magnitude( x )
        if( digits < 0 ) digits = 0
        if( digits > 100 ) digits = 100
        if(!isFinite ) return x
        return parseFloat(x).toFixed( Math.trunc( digits ) )
    }

    toF( c ) {
        return ( ( c * 9 ) / 5 ) + 32
    }
}