/*
 * Plugin Name: Vanilla Fake Select
 * Version: 0.11.1
 * Plugin URL: https://github.com/Darklg/JavaScriptUtilities
 * JavaScriptUtilities Vanilla Fake Select may be freely distributed under the MIT license.
 */

/* jshint browser: true */

var vanillaFakeSelect = function(el, settings) {
    "use strict";
    var self = this;
    self.defaultSettings = {
        autocompleteInsideTerm: false,
        coverText: 'Select a value',
        coverClass: '',
        enableScrollIntoView: false,
        fakeOptionTemplate: function(el) {
            return el.innerHTML;
        }
    };

    /* Items */
    self.el = el;
    self.wrapper = false;
    self.cover = false;
    self.list = false;
    self.listItems = [];
    self.isExpanded = false;
    self.userInteracted = false;
    self.tmpOptgroup = false;
    self.previousOptgroup = false;

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
        self.el.parentNode.insertBefore(self.wrapper, self.el.nextSibling);

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
        if (!self.cover) {
            self.cover = document.createElement('button');
            self.cover.className = 'fakeselect-cover';
            self.wrapper.appendChild(self.cover);
        }
        self.setElDisabled();
        self.setCoverValue(true);
    };

    self.setElDisabled = function() {
        self.cover.disabled = self.el.disabled;
    };

    /* Method : set list */
    self.setElList = function() {

        var i, len;

        // Create list if it doesn't exists
        if (!self.list) {
            self.list = document.createElement('ul');
            self.list.className = 'fakeselect-list';
            self.list.setAttribute('role', 'listbox');
        }

        // If existing values : clear all
        if (self.listItems.length) {
            for (i = 0, len = self.listItems.length; i < len; i++) {
                self.unsetElListItem(i);
            }
        }

        // Create values
        for (i = 0, len = self.el.options.length; i < len; i++) {
            self.setElListItem(i);
        }

        // Add items to the list
        self.wrapper.appendChild(self.list);
    };

    /* Method : unset list item */
    self.unsetElListItem = function(i) {
        self.listItems[i].removeEventListener('click', self.setCurrentValueEvent);
        self.list.removeChild(self.listItems[i]);
    };

    /* Method : set list item */
    self.setElListItem = function(i) {
        self.listItems[i] = document.createElement('li');
        self.listItems[i].setAttribute('data-i', i);
        self.listItems[i].setAttribute('role', 'option');

        // Optgroup
        self.tmpOptGroup = self.el.options[i].parentNode;
        if (self.tmpOptGroup.tagName == 'OPTGROUP') {
            self.listItems[i].setAttribute('data-optgroup', 1);
            self.setOptgroup(self.tmpOptGroup);
        }

        // Disabled
        if (self.el.options[i].disabled) {
            self.listItems[i].setAttribute('data-disabled', 1);
        }
        self.listItems[i].innerHTML = self.settings.fakeOptionTemplate(self.el.options[i]);
        self.list.appendChild(self.listItems[i]);
    };

    self.setOptgroup = function(optGroup) {
        var tmpLabel, liOptGroup;

        if (optGroup == self.previousOptgroup) {
            return;
        }
        self.previousOptgroup = optGroup;

        tmpLabel = optGroup.getAttribute('label') || '&nbsp;';

        // Create label
        liOptGroup = document.createElement('li');
        liOptGroup.innerHTML = tmpLabel;
        liOptGroup.className = 'optgroup-label';
        self.list.appendChild(liOptGroup);
    };

    /* Set Events
    -------------------------- */

    /* Method set Events */
    self.setEvents = function(onlyItems) {
        onlyItems = onlyItems || false;

        // Select first item
        self.setCurrentValue(0, false);

        // Click on list item
        for (var i = 0, len = self.listItems.length; i < len; i++) {
            if (self.listItems[i].getAttribute('data-disabled') == 1) {
                continue;
            }
            self.listItems[i].addEventListener('click', self.setCurrentValueEvent, 1);
        }

        if (onlyItems) {
            return false;
        }

        // click cover : toggle visibility list
        self.cover.addEventListener('click', function(e) {
            e.preventDefault();
            self.setVisibility();
        }, 1);

        // Select change : set cover
        self.el.addEventListener('focus', self.setFocusOnButton, 1);
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
            self.letter = String.fromCharCode(event.keyCode).toLowerCase();
            if (/[a-z0-9-_ ]/.test(self.letter)) {
                /* Disable timeout */
                clearTimeout(self.autocompleteTimer);
                /* Add to autocomplete */
                self.autocomplete += self.letter;
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
            maxItemNb = self.el.options.length;

        /* Search first result starting with autocomplete */
        for (i = 0; i < maxItemNb; i++) {
            tmpValue = self.removeAccents(self.el.options[i].innerHTML).toLowerCase();
            /* Ignore disabled items */
            if (self.el.options[i].disabled) {
                continue;
            }
            /* If content starts with autocomplete string */
            if (tmpValue.substring(0, aLen) == autocomplete) {
                self.setCurrentValue(i);
                break;
            }
            /* If content contains with autocomplete string */
            if (self.settings.autocompleteInsideTerm && tmpValue.search(autocomplete) > -1) {
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
            self.triggerEvent(self.el, 'change');
        }
        self.setActiveListItem(i);
    };

    /* Method set Cover */
    self.setCoverValue = function(initial) {
        var tmpValue = self.settings.coverText,
            tmpSelected;
        if (!self.cover) {
            return false;
        }
        if (typeof initial != 'boolean') {
            initial = false;
        }
        if (initial) {
            for (var i = 0, len = self.el.options.length; i < len; i++) {
                tmpSelected = self.el.options[i].getAttribute('selected');
                if (typeof tmpSelected == 'string') {
                    tmpValue = self.el.options[i].innerHTML;
                }
            }
        }
        else {
            // Get current value
            if (typeof self.el.selectedIndex == 'number') {
                tmpValue = self.el.options[self.el.selectedIndex].innerHTML;
            }
        }

        self.cover.innerHTML = tmpValue;
    };

    /* Method focus */
    self.setFocusOnButton = function() {
        self.cover.focus();
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

        /* User has opened at least once */
        if (mode === true) {
            self.userInteracted = true;
        }

        /* On close : ensure placeholder is replaced */
        if (mode === false && self.userInteracted) {
            self.setCoverValue();
        }
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
        if (self.settings.enableScrollIntoView && self.listItems[i].scrollIntoView) {
            self.listItems[i].scrollIntoView();
        }

    };

    /* Refresh
    -------------------------- */

    self.refresh = function() {
        self.setElList();
        self.setEvents(true);
        return self;
    };

    /* Destroy method
    -------------------------- */

    self.destroyCalls = function() {
        var parentItem = self.wrapper.parentNode;

        /* Restore select */
        self.el.removeAttribute('tabindex');

        /* Move select */
        parentItem.insertBefore(self.el, self.wrapper.nextSibling);

        /* Remove events */
        self.el.removeEventListener('focus', self.setFocusOnButton);
        self.el.removeEventListener('change', self.setCoverValue);
        self.el.removeEventListener('initcover', self.initCoverValue);
        window.removeEventListener('click', self.clickOutside);
        window.removeEventListener('keydown', self.keyboardEvents);

        /* Delete wrapper */
        parentItem.removeChild(self.wrapper);

        return self;
    };

    self.init(settings);

    return self;
};

/* Remove Accents */
vanillaFakeSelect.prototype.removeAccents = function(str) {
    "use strict";

    var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž',
        accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz",
        strSplit = str.split(''),
        accentedCharId;

    /* Search if char is in accented list */
    for (var i = 0, len = strSplit.length; i < len; i++) {
        accentedCharId = accents.indexOf(strSplit[i]);
        if (accentedCharId >= 0) {
            str = str.replace(accents[accentedCharId], accentsOut[accentedCharId]);
        }
    }

    return str;
};

/* Get Settings */
vanillaFakeSelect.prototype.getSettings = function(settings) {
    "use strict";

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

/* Get Settings */
vanillaFakeSelect.prototype.triggerEvent = function(el, eventName, parameters) {
    var e = false;
    parameters = parameters || {};
    if (document.createEventObject) {
        e = document.createEventObject();
        e.button = 1;
        e.triggerParams = parameters;
        return el.fireEvent("on" + eventName, e);
    }
    else {
        e = document.createEvent("HTMLEvents");
        e.initEvent(eventName, true, false);
        e.triggerParams = parameters;
        return el.dispatchEvent(e);
    }
};
