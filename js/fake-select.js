/*
 * Plugin Name: Vanilla Fake Select
 * Version: 0.6
 * Plugin URL: https://github.com/Darklg/JavaScriptUtilities
 * JavaScriptUtilities Vanilla Fake Select may be freely distributed under the MIT license.
 */

/* jshint browser: true */

var vanillaFakeSelect = function(el, settings) {
    "use strict";
    var self = this;
    self.defaultSettings = {
        coverText: 'Select a value',
        coverClass: '',
        enableScrollIntoView: false,
    };

    /* Items */
    self.el = el;
    self.wrapper = false;
    self.cover = false;
    self.list = false;
    self.listItems = [];
    self.isExpanded = false;

    /* Autocomplete */
    self.letter = '';
    self.autocomplete = '';
    self.autocompleteTimer = false;

    /* Method init */
    self.init = function(settings) {
        self.getSettings(settings);
        self.setElements();
        self.setEvents();
    };

    /* set Elements
    -------------------------- */

    self.setElements = function() {

        self.el.setAttribute('tabindex', '-1');

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
        self.wrapper.setAttribute('role', 'combobox');
        self.wrapper.className = 'fakeselect-wrapper ' + self.settings.coverClass;
        self.setVisibility(false);
    };

    /* Method : set cover */
    self.setElCover = function() {
        self.cover = document.createElement('button');
        self.cover.className = 'fakeselect-cover';
        self.setCoverValue();
        self.wrapper.appendChild(self.cover);
    };

    /* Method : set list */
    self.setElList = function() {

        // Create list
        self.list = document.createElement('ul');
        self.list.className = 'fakeselect-list';
        self.list.setAttribute('role', 'listbox');

        // Create values
        for (var i = 0, len = self.el.options.length; i < len; i++) {
            self.listItems[i] = document.createElement('li');
            self.listItems[i].setAttribute('data-i', i);
            self.listItems[i].setAttribute('role', 'option');
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
        self.cover.addEventListener('click', function(e) {
            e.preventDefault();
            self.setVisibility();
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
            self.clearAutocomplete();
            self.setVisibility(false);
        }

        /* Expanded : set temp value */
        if (self.isExpanded) {

            /* Tab */
            if (e.keyCode == 9) {
                self.setVisibility(false);
            }

            /* Arrow up */
            if (e.keyCode == 38) {
                e.preventDefault();
                self.setActiveListItem('less');
            }
            /* Arrow down */
            if (e.keyCode == 40) {
                e.preventDefault();
                self.setActiveListItem('plus');
            }
            /* Enter */
            if (e.keyCode == 13) {
                e.preventDefault();
                self.setCurrentValue(self.tmpValue, true);
                self.setVisibility(false);
            }
        }

        /* Not expanded but focused */
        if (!self.isExpanded && self.isFocused()) {
            /* Arrow down */
            if (e.keyCode == 38 || e.keyCode == 40) {
                e.preventDefault();
                self.setVisibility(true);
            }
        }

        /* Focused */
        if (self.isFocused()) {
            /* Letter : autocomplete */
            self.letter = String.fromCharCode(event.keyCode);
            if (/[a-zA-Z0-9-_ ]/.test(self.letter)) {
                /* Disable timeout */
                clearTimeout(self.autocompleteTimer);
                /* Add to autocomplete */
                self.autocomplete += self.letter.toLowerCase();
                /* Search for a value */
                self.setActiveAutocompleteMatch(self.autocomplete);
                /* After a certain time : disable autocomplete */
                self.autocompleteTimer = setTimeout(self.clearAutocomplete, 1000);
            }
        }
    };

    self.setActiveAutocompleteMatch = function(autocomplete) {
        autocomplete = autocomplete || '';
        var i,
            tmpValue,
            aLen = autocomplete.length,
            maxItemNb = self.listItems.length;

        /* Search first result starting with autocomplete */
        for (i = 0; i < maxItemNb; i++) {
            tmpValue = self.listItems[i].innerHTML.toLowerCase();
            if (!self.listItems[i].disabled && tmpValue.substring(0, aLen) == autocomplete) {
                /* Select */
                self.setCurrentValue(i);
                break;
            }
        }

    };

    self.clearAutocomplete = function() {
        clearTimeout(self.autocompleteTimer);
        self.letter = '';
        self.autocomplete = '';
    };

    self.isFocused = function() {
        return document.activeElement == self.cover;
    };

    /* Click outside wrapper : close */
    self.clickOutside = function(e) {
        if (!self.wrapper.contains(e.target)) {
            self.setVisibility(false);
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
        self.setVisibility(false);
        if (triggerChange) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('change', true, false);
            self.el.dispatchEvent(event);
        }

        self.setActiveListItem(i);
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

    /* Toggle list visibility */
    self.setVisibility = function(mode) {
        if (typeof mode != 'boolean') {
            mode = !self.isExpanded;
        }
        self.isExpanded = mode;
        self.wrapper.setAttribute('aria-expanded', self.isExpanded);

        /* Set temporary value on toggle */
        self.tmpValue = self.el.selectedIndex;
    };

    /* Set active list item */
    self.setActiveListItem = function(i) {
        var maxItemNb = self.listItems.length,
            originI = i;

        if (i == 'plus') {
            i = self.tmpValue + 1;
        }

        if (i == 'less') {
            i = self.tmpValue - 1;
        }

        if (typeof i != 'number') {
            i = self.tmpValue;
        }

        i = Math.max(0, i);
        i = Math.min(maxItemNb - 1, i);

        // If item is disabled : do not move
        if (self.el.options[i].disabled) {
            // Try to jump the disabled item
            // Plus
            if (originI == 'plus' && i < maxItemNb) {
                self.setActiveListItem(i + 1);
            }
            // Less
            if (originI == 'less' && i > 0) {
                self.setActiveListItem(i - 1);
            }
            return false;
        }

        // Ensure tmpValue is correct
        self.tmpValue = i;

        // Remove current class
        for (var ii = 0; ii < maxItemNb; ii++) {
            self.listItems[ii].setAttribute('data-current', 0);
        }

        // Add current class on current item
        self.listItems[i].setAttribute('data-current', 1);
        if (settings.enableScrollIntoView && self.listItems[i].scrollIntoView) {
            self.listItems[i].scrollIntoView();
        }

    };

    /* Destroy method
    -------------------------- */

    self.destroyCalls = function() {
        var parentItem = self.wrapper.parentNode;

        /* Restore select */
        self.el.removeAttribute('tabindex');

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
