module.exports = Object.freeze(
    {
        EC_SALINITY: 0x3c, // EC Salinity probe I2C address

        EC_MEASURE_EC: 80, // start an EC measure
        EC_MEASURE_TEMP: 40, // measure temperature
        EC_CALIBRATE_PROBE: 20, // calibrate the probe
        EC_CALIBRATE_LOW: 10, // low point calibration
        EC_CALIBRATE_HIGH: 8, // high point calibration
        EC_I2C: 4, // Command to change the i2c address
        EC_READ: 2, // Command to read from EEPROM
        EC_WRITE: 1, // Command to write to EEPROM

        EC_VERSION_REGISTER: 0, // version register
        EC_MS_REGISTER: 1, // mS register
        EC_TEMP_REGISTER: 5, // temperature in C register
        EC_SOLUTION_REGISTER: 9, // calibration solution register
        EC_TEMPCOEF_REGISTER: 13, // temperatue coefficient register
        EC_CALIBRATE_REFHIGH_REGISTER: 17, // reference low register
        EC_CALIBRATE_REFLOW_REGISTER: 21, // reference high register
        EC_CALIBRATE_READHIGH_REGISTER: 25, // reading low register
        EC_CALIBRATE_READLOW_REGISTER: 29, // reading high register
        EC_CALIBRATE_OFFSET_REGISTER: 33, // calibration offset
        EC_SALINITY_PSU: 37, // Salinity register
        EC_RAW_REGISTER: 41, // raw count register
        EC_TEMP_COMPENSATION_REGISTER: 45, // temperature compensation register
        EC_BUFFER_REGISTER: 49, // buffer register
        EC_FW_VERSION_REGISTER: 53, // firmware version register
        EC_CONFIG_REGISTER: 54, // config register
        EC_TASK_REGISTER: 55, // task register

        EC_EC_MEASUREMENT_TIME: 500, // delay between EC measurements
        EC_TEMP_MEASURE_TIME: 750, // delay for temperature measurement
        EC_TEMP_COMPENSATION_CONFIG_BIT: 1, // temperature compensation config bit
        EC_DUALPOINT_CONFIG_BIT: 0 // dual point config bit
    }
)


