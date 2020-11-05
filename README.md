unofficial JS Port of uFire python EC board code
 
https://github.com/u-fire/Isolated_EC/tree/master/python/RaspberryPi

You should configure your raspberry pi to use software i2c before using this library.
    
See https://www.ufire.co/docs/uFire_EC/#raspberry-pi and https://github.com/fivdi/i2c-bus/blob/master/doc/raspberry-pi-software-i2c.md

This library follows the same API as the python library defined here*:
https://www.ufire.co/docs/uFire_EC/api.html

\* The ability to control blocking instead controls whether the command will wait for a result or not and methods will
    always return a promise because, there's no way to synchronously sleep in js.