'use strict';

const Homey = require('homey');

module.exports = class SplitAircoDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow.getActionCard('set_operation_mode')
      .registerRunListener(async ({ device, mode }) => {
        return device.triggerCapabilityListener('operation_mode', mode);
      });
    this.homey.flow.getActionCard('set_fan_mode')
      .registerRunListener(async ({ device, speed }) => {
        return device.triggerCapabilityListener('fan_mode', speed);
      });
    this.homey.flow.getActionCard('set_swingv_mode')
      .registerRunListener(async ({ device, swingVMode }) => {
        return device.triggerCapabilityListener('swingv_mode', swingVMode);
      });
    this.homey.flow.getActionCard('set_swingh_mode')
      .registerRunListener(async ({ device, swingHMode }) => {
        return device.triggerCapabilityListener('swingh_mode', swingHMode);
      });
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [{
      data: {
        id: `${Math.random()}`,
      },
    }];
  }

};
