/*
 * Plugin Name: Vanilla Fake Select
 * Version: 0.3
 * Plugin URL: https://github.com/Darklg/JavaScriptUtilities
 * JavaScriptUtilities Vanilla Fake Select may be freely distributed under the MIT license.
 */

"use strict";

var vanillaFakeSelect = function(el, settings) {
    var self = this;
    self.defaultSettings = {
        coverText: 'Select a value',
        coverClass: '',
    };

    /* Items */
    self.el = el;
    self.wrapper = false;
    self.cover = false;
    self.list = false;
    self.listItems = [];

    /* Method init */
    self.init = function(settings) {
        self.getSettings(settings);
        self.setElements();
        self.setEvents();
    };

    /* set Elements
    -------------------------- */

    self.setElements = function() {
        // Create items
        self.setElWrapper();
        self.setElCover();
        self.setElList();

        // Inject wrapper next to el
        self.el.parentNode.appendChild(self.wrapper);

        // Move el into wrapper
        self.wrapper.appendChild(self.el);

    };

    /* Method : set wrapper */
    self.setElWrapper = function() {
        self.wrapper = document.createElement('div');
        self.wrapper.className = 'fakeselect-wrapper ' + self.settings.coverClass;
        self.wrapper.setAttribute('data-visible', '0');

    };

    /* Method : set cover */
    self.setElCover = function() {
        self.cover = document.createElement('div');
        self.cover.className = 'fakeselect-cover';
        self.setCoverValue();
        self.wrapper.appendChild(self.cover);
    };

    /* Method : set list */
    self.setElList = function() {

        // Create list
        self.list = document.createElement('ul');
        self.list.className = 'fakeselect-list';

        // Create values
        for (var i = 0, len = self.el.options.length; i < len; i++) {
            self.listItems[i] = document.createElement('li');
            self.listItems[i].setAttribute('data-i', i);
            if (self.el.options[i].disabled) {
                self.listItems[i].setAttribute('data-disabled', 1);
            }
            self.listItems[i].innerHTML = self.el.options[i].innerHTML;
            self.list.appendChild(self.listItems[i]);
        }

        // Add items to the list
        self.wrapper.appendChild(self.list);
    };

    /* Set Events
    -------------------------- */

    /* Method set Events */
    self.setEvents = function() {

        // Select first item
        self.setCurrentValue(0, false);

        // Click on list item
        for (var i = 0, len = self.listItems.length; i < len; i++) {
            if (self.listItems[i].getAttribute('data-disabled') == 1) {
                continue;
            }
            self.listItems[i].addEventListener('click', self.setCurrentValueEvent);
        }

        // click cover : toggle visibility list
        self.cover.addEventListener('click', function() {
            var val = self.wrapper.getAttribute('data-visible');
            self.wrapper.setAttribute('data-visible', val == '0' ? '1' : '0');
        }, 1);

        // Select change : set cover
        self.el.addEventListener('change', self.setCoverValue, 1);
        self.el.addEventListener('initcover', self.setCoverValue, 1);

        // Click outside
        window.addEventListener('click', self.clickOutside, 1);
        window.addEventListener('keydown', self.keyboardEvents, 1);
    };

    /* Keyboard events */
    self.keyboardEvents = function(e) {
        /* Close */
        if (e.keyCode == 27) {
            self.wrapper.setAttribute('data-visible', '0');
        }
    };

    /* Click outside wrapper : close */
    self.clickOutside = function(e) {
        if (!self.wrapper.contains(e.target)) {
            self.wrapper.setAttribute('data-visible', '0');
        }
    };

    /* Method set Current value event */
    self.setCurrentValueEvent = function() {
        self.setCurrentValue(parseInt(this.getAttribute('data-i'), 10));
    };

    /* Method set Current value */
    self.setCurrentValue = function(i, triggerChange) {
        triggerChange = typeof triggerChange === "boolean" ? triggerChange : true;

        // Trigger changes on select
        self.el.selectedIndex = i;
        self.wrapper.setAttribute('data-visible', 0);
        if (triggerChange) {
            self.el.dispatchEvent(new Event('change'));
        }

        // Remove current class
        for (var ii = 0, len = self.listItems.length; ii < len; ii++) {
            self.listItems[ii].setAttribute('data-current', 0);
        }

        // Add current class on current item
        self.listItems[i].setAttribute('data-current', 1);

    };

    /* Method set Cover */
    self.setCoverValue = function() {
        // Get current value
        var tmpValue = self.el.options[self.el.selectedIndex].innerHTML;
        if (!tmpValue) {
            // No value : default value
            tmpValue = settings.coverText;
        }

        self.cover.innerHTML = tmpValue;
    };

    /* Destroy method
    -------------------------- */

    self.destroyCalls = function() {
        var parentItem = self.wrapper.parentNode;
        /* Move select */
        parentItem.appendChild(self.el);
        /* Remove events */
        self.el.removeEventListener('change', self.setCoverValue);
        self.el.removeEventListener('initcover', self.initCoverValue);
        window.removeEventListener('click', self.clickOutside);
        window.removeEventListener('keydown', self.keyboardEvents);

        /* Delete wrapper */
        parentItem.removeChild(self.wrapper);
    };

    self.init(settings);

    return self;
};

/* Get Settings */
vanillaFakeSelect.prototype.getSettings = function(settings) {
    var nSettings;
    if (typeof settings != 'object') {
        settings = {};
    }
    (function() {
        if ('loadElement' in settings && settings.loadElement.getAttribute('data-settings')) {
            nSettings = JSON.parse(settings.loadElement.getAttribute('data-settings'));
            if (typeof nSettings == 'object') {
                nSettings.el = settings.loadElement;
                settings = nSettings;
            }
        }
    }());
    this.settings = {};
    // Set default values
    for (var attr in this.defaultSettings) {
        this.settings[attr] = this.defaultSettings[attr];
    }
    // Set new values
    for (var attr2 in settings) {
        this.settings[attr2] = settings[attr2];
    }
};
