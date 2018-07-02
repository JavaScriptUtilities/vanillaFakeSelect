/*
 * Plugin Name: Vanilla Fake Select
 * Version: 0.12.2
 * Plugin URL: https://github.com/Darklg/JavaScriptUtilities
 * JavaScriptUtilities Vanilla Fake Select may be freely distributed under the MIT license.
 */

/* jshint browser: true */

var vanillaFakeSelect = function(el, settings) {
    "use strict";
    var self = this;
    var _defaultSettings = {
        autocompleteInsideTerm: false,
        displaySearch: true,
        searchResetSearchOnClose: false,
        noResultsText: 'No results found',
        searchText: 'Search a value',
        coverText: 'Select a value',
        coverClass: '',
        enableScrollIntoView: false,
        fakeOptionTemplate: function(el) {
            return el.innerHTML;
        }
    };

    /* Items */
    var _el = el;
    var _wrapper = false;
    var _searchBox = false;
    var _searchField = false;
    var _searchNoResults = false;
    var _searchButton = false;
    var _cover = false;
    var _list = false;
    var _listItems = [];
    var _isExpanded = false;
    var _userInteracted = false;
    var _tmpOptGroup = false;
    var _previousOptGroup = false;

    /* Autocomplete */
    var _letter = '';
    var _autocomplete = '';
    var _autocompleteTimer = false;

    /* Settings */
    var _appSettings = false;

    /* Method init */
    var self_init = function(settings) {
        _appSettings = self.getSettings(settings, _defaultSettings);
        setElements();
        setEvents();
    };

    /* set Elements
    -------------------------- */

    var setElements = function() {

        _el.setAttribute('tabindex', '-1');

        // Create items
        setElWrapper();
        setElCover();
        setElList();

        // Inject wrapper next to el
        _el.parentNode.insertBefore(_wrapper, _el.nextSibling);

        // Move el into wrapper
        _wrapper.appendChild(_el);

    };

    /* Method : set wrapper */
    var setElWrapper = function() {
        _wrapper = self.cEl('div', [
            ['role', 'combobox'],
            ['class', 'fakeselect-wrapper ' + _appSettings.coverClass]
        ]);
        setVisibility(false);
    };

    /* Method : set cover */
    var setElCover = function() {
        if (!_cover) {
            _cover = self.cEl('a', [
                ['href', '#'],
                ['role', 'button'],
                ['class', 'fakeselect-cover']
            ]);
            _wrapper.appendChild(_cover);
        }
        setElDisabled();
        setCoverValue(true);
    };

    var setElDisabled = function() {
        _cover.disabled = _el.disabled;
    };

    /* Method : set list */
    var setElList = function() {

        var i, len;

        // Create list if it doesn't exists
        if (!_list) {
            _list = self.cEl('ul', [
                ['class', 'fakeselect-list'],
                ['role', 'listbox']
            ]);
        }

        // If existing values : clear all
        if (_listItems.length) {
            for (i = 0, len = _listItems.length; i < len; i++) {
                unsetElListItem(i);
            }
        }

        if (_appSettings.displaySearch) {
            setSearchFieldItem();
        }

        // Create values
        for (i = 0, len = _el.options.length; i < len; i++) {
            setElListItem(i);
        }

        // Add items to the list
        _wrapper.appendChild(_list);
    };

    /* Method : unset list item */
    var unsetElListItem = function(i) {
        _listItems[i].removeEventListener('click', setCurrentValueEvent);
        _list.removeChild(_listItems[i]);
    };

    var setSearchFieldItem = function() {
        _searchBox = self.cEl('li', [
            ['class', 'fakeselect-search']
        ]);

        _searchField = self.cEl('input', [
            ['type', 'text'],
            ['name', 'fakeselect-search'],
            ['placeholder', _appSettings.searchText]
        ]);

        _searchButton = self.cEl('button', [
            ['type', 'button']
        ]);

        _searchNoResults = self.cEl('li', [
            ['class', 'fakeselect-noresults']
        ]);
        _searchNoResults.innerHTML = _appSettings.noResultsText;

        _searchBox.appendChild(_searchField);
        _searchBox.appendChild(_searchButton);
        _list.appendChild(_searchBox);
        _list.appendChild(_searchNoResults);
    };

    /* Method : set list item */
    var setElListItem = function(i) {
        _listItems[i] = self.cEl('li', [
            ['data-i', i],
            ['role', 'option']
        ]);

        // Optgroup
        _tmpOptGroup = _el.options[i].parentNode;
        if (_tmpOptGroup.tagName == 'OPTGROUP') {
            _listItems[i].setAttribute('data-optgroup', 1);
            setOptgroup(_tmpOptGroup);
        }

        // Disabled
        if (_el.options[i].disabled) {
            _listItems[i].setAttribute('data-disabled', 1);
        }
        _listItems[i].innerHTML = _appSettings.fakeOptionTemplate(_el.options[i]);
        _list.appendChild(_listItems[i]);
    };

    var setOptgroup = function(optGroup) {
        if (optGroup == _previousOptGroup) {
            return;
        }
        _previousOptGroup = optGroup;

        // Create label
        var liOptGroup = self.cEl('li', [
            ['class', 'optgroup-label']
        ]);
        liOptGroup.innerHTML = optGroup.getAttribute('label') || '&nbsp;';
        _list.appendChild(liOptGroup);
    };

    /* Set Events
    -------------------------- */

    /* Method set Events */
    var setEvents = function(onlyItems) {
        onlyItems = onlyItems || false;

        // Select selected item or first item
        setCurrentValue(_el.selectedIndex ? _el.selectedIndex : 0, false);

        // Click on list item
        for (var i = 0, len = _listItems.length; i < len; i++) {
            if (_listItems[i].getAttribute('data-disabled') == 1) {
                continue;
            }
            _listItems[i].addEventListener('click', setCurrentValueEvent, 1);
        }

        if (onlyItems) {
            return false;
        }

        // click cover : toggle visibility list
        _cover.addEventListener('click', function(e) {
            e.preventDefault();
            setVisibility();
        }, 1);

        if (_appSettings.displaySearch) {
            _searchField.addEventListener('keyup', filterDisplayedResults, 1);
            _searchButton.addEventListener('click', filterDisplayedResults, 1);
        }

        // Select change : set cover
        _el.addEventListener('focus', setFocusOnButton, 1);
        _el.addEventListener('change', setCoverValue, 1);
        _el.addEventListener('initcover', setCoverValue, 1);

        // Click outside
        window.addEventListener('click', clickOutside, 1);
        window.addEventListener('keydown', keyboardEvents, 1);
    };

    /* Keyboard events */
    var keyboardEvents = function(e) {
        /* Close */
        if (e.keyCode == 27) {
            clearAutocomplete();
            setVisibility(false);
        }

        /* Expanded : set temp value */
        if (_isExpanded) {

            /* Tab */
            if (e.keyCode == 9) {
                setVisibility(false);
            }

            /* Arrow up */
            if (e.keyCode == 38) {
                e.preventDefault();
                setActiveListItem('less');
            }
            /* Arrow down */
            if (e.keyCode == 40) {
                e.preventDefault();
                setActiveListItem('plus');
            }
            /* Enter */
            if (e.keyCode == 13) {
                e.preventDefault();
                setCurrentValue(self.tmpValue, true);
                setVisibility(false);
            }
        }

        /* Not expanded but focused */
        if (!_isExpanded && isFocused()) {
            /* Arrow down */
            if (e.keyCode == 38 || e.keyCode == 40) {
                e.preventDefault();
                setVisibility(true);
            }
        }

        /* Focused */
        if (isFocused()) {
            /* Letter : autocomplete */
            _letter = String.fromCharCode(event.keyCode).toLowerCase();
            if (/[a-z0-9-_ ]/.test(_letter)) {
                /* Disable timeout */
                clearTimeout(_autocompleteTimer);
                /* Add to autocomplete */
                _autocomplete += _letter;
                /* Search for a value */
                setActiveAutocompleteMatch(_autocomplete);
                /* After a certain time : disable autocomplete */
                _autocompleteTimer = setTimeout(clearAutocomplete, 1000);
            }
        }
    };

    var setActiveAutocompleteMatch = function(autocomplete) {
        autocomplete = autocomplete || '';
        var i,
            tmpValue,
            aLen = autocomplete.length,
            maxItemNb = _el.options.length;

        /* Search first result starting with autocomplete */
        for (i = 0; i < maxItemNb; i++) {
            tmpValue = self.removeAccents(_el.options[i].innerHTML).toLowerCase();
            /* Ignore disabled items */
            if (_el.options[i].disabled) {
                continue;
            }
            /* If content starts with autocomplete string */
            if (tmpValue.substring(0, aLen) == autocomplete) {
                setCurrentValue(i);
                break;
            }
            /* If content contains autocomplete string */
            if (_appSettings.autocompleteInsideTerm && tmpValue.search(autocomplete) > -1) {
                setCurrentValue(i);
                break;
            }
        }
    };

    var resetDisplayedResults = function() {
        setItemVisibility(_searchNoResults, 0);
        for (var i = 0, len = _listItems.length; i < len; i++) {
            setItemVisibility(_listItems[i], 1);
        }
    };

    var filterDisplayedResults = function(e) {
        /* Down : go to first result */
        if (e.keyCode && e.keyCode == 40) {
            e.preventDefault();
            e.stopPropagation();
            _searchField.blur();
            setActiveListItem('more');
            return;
        }
        resetDisplayedResults();
        for (var i = 0, len = _listItems.length; i < len; i++) {
            setItemVisibility(_listItems[i], 0);
            if (_listItems[i].innerText.toLowerCase().search(_searchField.value) > -1) {
                setItemVisibility(_listItems[i], 1);
            }
        }
        setActiveListItem(getFirstActiveElement());
    };

    var setItemVisibility = function(item, visibility) {
        item.setAttribute('data-visible', visibility);
    };

    var clearAutocomplete = function() {
        clearTimeout(_autocompleteTimer);
        _letter = '';
        _autocomplete = '';
    };

    var isFocused = function() {
        return document.activeElement == _cover;
    };

    /* Click outside wrapper : close */
    var clickOutside = function(e) {
        if (!_wrapper.contains(e.target)) {
            setVisibility(false);
        }
    };

    /* Method set Current value event */
    var setCurrentValueEvent = function() {
        setCurrentValue(parseInt(this.getAttribute('data-i'), 10));
    };

    /* Method set Current value */
    var setCurrentValue = function(i, triggerChange) {
        triggerChange = typeof triggerChange === "boolean" ? triggerChange : true;

        // Trigger changes on select
        _el.selectedIndex = i;
        setVisibility(false);
        if (triggerChange) {
            self.triggerEvent(_el, 'change');
        }
        setActiveListItem(i);
    };

    /* Method set Cover */
    var setCoverValue = function(initial) {
        var tmpValue = _appSettings.coverText,
            tmpSelected;
        if (!_cover) {
            return false;
        }
        if (typeof initial != 'boolean') {
            initial = false;
        }
        if (initial) {
            for (var i = 0, len = _el.options.length; i < len; i++) {
                tmpSelected = _el.options[i].getAttribute('selected');
                if (typeof tmpSelected == 'string') {
                    tmpValue = _el.options[i].innerHTML;
                }
            }
        }
        else {
            // Get current value
            if (typeof _el.selectedIndex == 'number') {
                tmpValue = _el.options[_el.selectedIndex].innerHTML;
            }
        }

        _cover.innerHTML = tmpValue;
    };

    /* Method focus */
    var setFocusOnButton = function() {
        _cover.focus();
    };

    /* Toggle list visibility */
    var setVisibility = function(mode) {
        if (typeof mode != 'boolean') {
            mode = !_isExpanded;
        }
        _isExpanded = mode;
        _wrapper.setAttribute('aria-expanded', _isExpanded);

        /* Reset search */
        if (!_isExpanded && _searchField && self.searchResetSearchOnClose) {
            setTimeout(function() {
                _searchField.value = '';
                resetDisplayedResults();
            }, 50);
        }

        /* Set temporary value on toggle */
        self.tmpValue = _el.selectedIndex;

        /* User has opened at least once */
        if (mode === true) {
            _userInteracted = true;
        }

        /* On close : ensure placeholder is replaced */
        if (mode === false && _userInteracted) {
            setCoverValue();
        }
    };

    /* Set active list item */
    var setActiveListItem = function(i) {
        var maxItemNb = _listItems.length,
            lastActiveElement = getLastActiveElement(),
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

        // Ensure tmpValue is correct
        self.tmpValue = i;

        // If item is not available : do not move
        if (!isActiveElement(i)) {
            // Try to jump the disabled item

            // Plus
            if (originI === 0 || (originI == 'plus' && i < maxItemNb)) {
                if (lastActiveElement !== false) {
                    if (originI == lastActiveElement) {
                        setActiveListItem(lastActiveElement);
                    }
                    else {
                        setActiveListItem('plus');
                    }
                }
                else {
                    /* No results : display a message */
                    setItemVisibility(_searchNoResults, 1);
                }
            }
            // Less
            if (originI == 'less') {
                if (i > 0) {
                    setActiveListItem('less');
                }
                else {
                    setActiveListItem(getFirstActiveElement());
                }
            }
            return false;
        }

        // Remove current class
        for (var ii = 0; ii < maxItemNb; ii++) {
            _listItems[ii].setAttribute('data-current', 0);
        }

        // Add current class on current item
        _listItems[i].setAttribute('data-current', 1);
        if (_appSettings.enableScrollIntoView && _listItems[i].scrollIntoView) {
            _listItems[i].scrollIntoView();
        }

    };

    var isActiveElement = function(i) {
        /* Hidden */
        var itemVisible = _listItems[i].getAttribute('data-visible');
        if (itemVisible === 0 || itemVisible == '0') {
            return false;
        }
        /* Disabled */
        if (_listItems[i].getAttribute('data-disabled') == 1 || _listItems[i].disabled) {
            return false;
        }
        return true;
    };

    var getFirstActiveElement = function(i) {
        var maxItemNb = _el.options.length;
        for (var ii = 0; ii < maxItemNb; ii++) {
            if (isActiveElement(ii)) {
                return ii;
            }
        }
        return 0;
    };

    var getLastActiveElement = function(i) {
        var lastActiveElement = false;
        var maxItemNb = _el.options.length;
        for (var ii = 0; ii < maxItemNb; ii++) {
            if (isActiveElement(ii)) {
                lastActiveElement = ii;
            }
        }
        return lastActiveElement;
    };

    /* Refresh
    -------------------------- */

    self.refresh = function() {
        setElList();
        setEvents(true);
        return self;
    };

    /* Destroy method
    -------------------------- */

    self.destroyCalls = function() {
        var parentItem = _wrapper.parentNode;

        /* Restore select */
        _el.removeAttribute('tabindex');

        /* Move select */
        parentItem.insertBefore(_el, _wrapper.nextSibling);

        /* Remove events */
        _el.removeEventListener('focus', setFocusOnButton);
        _el.removeEventListener('change', setCoverValue);
        _el.removeEventListener('initcover', setCoverValue);
        window.removeEventListener('click', clickOutside);
        window.removeEventListener('keydown', keyboardEvents);

        /* Delete wrapper */
        parentItem.removeChild(_wrapper);

        return self;
    };

    self_init(settings);

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
vanillaFakeSelect.prototype.getSettings = function(settings, defaultSettings) {
    "use strict";

    var nSettings;
    if (typeof settings != 'object') {
        settings = {};
    }
    (function() {
        if (!('loadElement' in settings)) {
            return;
        }
        var _dataSettings = settings.loadElement.getAttribute('data-settings');
        if (!_dataSettings) {
            return;
        }
        nSettings = JSON.parse(_dataSettings);
        if (typeof nSettings == 'object') {
            nSettings.el = settings.loadElement;
            settings = nSettings;
        }
    }());
    var nSettingsFinal = {};
    // Set default values
    for (var attr in defaultSettings) {
        nSettingsFinal[attr] = defaultSettings[attr];
    }
    // Set new values
    for (var attr2 in settings) {
        nSettingsFinal[attr2] = settings[attr2];
    }
    return nSettingsFinal;
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

vanillaFakeSelect.prototype.cEl = function(elType, attributes) {
    var _el = document.createElement(elType);
    for (var i = 0, len = attributes.length; i < len; i++) {
        _el.setAttribute(attributes[i][0], attributes[i][1]);
    }
    return _el;
};
