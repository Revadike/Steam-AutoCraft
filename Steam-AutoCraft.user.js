// ==UserScript==
// @name         Steam-AutoCraft
// @version      1.4.6
// @description  AutoCraft Steam Community Badges
// @author       10101000
// @include      /^(http|https)\:\/\/steamcommunity\.com\/(id\/.+|profiles\/7656119[0-9]{10})\/(badges|badges\/.*|gamecards\/.+)$/
// @copyright    2016 10101000
// @grant        none
// ==/UserScript==

// Isolate jQuery for compatibility with other scripts
jQuery.noConflict();

// Vars
var canCraftBadge            = 0;
var isBadgesPage             = 0;
var isGameCardsPage          = 0;
var craftRefreshTimeoutmsDef = 2000;
var pageRefreshTimeoutmsDef  = 10000;
var craftRefreshTimeoutms    = craftRefreshTimeoutmsDef;
var pageRefreshTimeoutms     = pageRefreshTimeoutmsDef;
var gameIdBlackList          = '';
var gamecardHref             = '';
var redirect                 = 0;

// Badges
var badgeLinks    = jQuery('.badge_details_set_favorite');
// Gamecards
var invLinks      = jQuery('.gamecards_inventorylink');
// Gamecard badge progress
var badgeProgress = jQuery('.gamecard_badge_progress');

// Run
jQuery(document).ready(function(){
    // Check settings
    checkSettings();

    // Determine current page
    if (invLinks.length >= 1) {
        isGameCardsPage  = 1;
    } else if ((badgeLinks.length >= 1) && (invLinks.length <= 0)) {
        isBadgesPage     = 1;
    }

    // Check for badges to craft
    if (jQuery('.badge_craft_button').length >= 1){
        if ((jQuery('.badge_progress_tasks').length >= 1) || (badgeProgress.length >= 1)){
            canCraftBadge  = 1;
        }
    }

    // Badge page logic
    if (isBadgesPage === 1) {
        if (window.sessionStorage.craftRecursive) {
            if (canCraftBadge === 1) {
                checkBlacklist();
            } else {
                delete window.sessionStorage.craftRecursive;
            }
        }
    }

    // Gamecard page logic
    if (isGameCardsPage === 1) {
        if (canCraftBadge === 0) {
            delete window.sessionStorage.autoCraftState;
        }

        if (window.sessionStorage.craftRecursive) {
            // If all badges have been crafted, load badges page
            window.location.href = jQuery('div').find('.profile_small_header_text a.whiteLink').attr('href') + '/badges/';
        }
    }

    // Always add button
    addButton();

    // Disable reset button when applicable
    if ((pageRefreshTimeoutms === pageRefreshTimeoutmsDef) && (craftRefreshTimeoutms === craftRefreshTimeoutmsDef) && (!gameIdBlackList)) {
        jQuery('#autocraft_button_reset').addClass('btn_disabled');
        jQuery('#autocraft_button_reset').prop("disabled",true);
    } else {
        jQuery('#autocraft_button_reset').removeClass('btn_disabled');
    }

    // Start autoCraft
    if ((canCraftBadge === 1) && ((window.sessionStorage.autoCraftState) || (window.sessionStorage.craftRecursive))) {
        if (redirect === 1) {
            window.location.href = gamecardHref;
        }
        autoCraft();
    }
});

function addButton() {
    // Set HTML vars
    var settingsHead           = '<h3 align="left">Steam-AutoCraft Settings</h3>';
    var settingsForm           = '<form id="autocraft_settings_form" align="left">';
    var settingsRefreshIn      = 'Page Refresh Timeout (ms): <input type="text" id="autocraft_setting_refresh_timeout" name="autocraft_setting_refresh_timeout" value="'+pageRefreshTimeoutms+'"> The the longer refresh that happens after crafting each badge in milliseconds.<br>';
    var settingsCraftRefreshIn = 'Craft Refresh Timeout (ms): &nbsp;<input type="text" id="autocraft_setting_craft_refresh_timeout" name="autocraft_setting_craft_refresh_timeout" value="'+craftRefreshTimeoutms+'"> The short refresh that we set immediately after beginning a craft in milliseconds.<br>';
    var settingsIDBlacklist    = 'Game ID Blacklist (id1,id2): &nbsp;&nbsp;<input type="text" id="autocraft_setting_blacklist" name="autocraft_setting_blacklist" value="'+gameIdBlackList+'"> Game ID blacklisting in the form of 12345,67890. We skip these games.<br>';
    var settingsButtonReset    = '<input id="autocraft_button_reset" type="button" class="btn_grey_grey btn_small_thin" name="Reset" value="Reset" align="left">';
    var settingsButtonSave     = '<input id="autocraft_button_save" type="button" class="btn_grey_grey btn_small_thin" name="Save" value="Save" align="left">';

    // Add button to badge details page
    if (isGameCardsPage === 1){
        // Add settings div
        jQuery('<div/>', {
            id:    'autocraft_settings_div',
            class: 'badge_details_set_favorite',
            title: 'Steam-AutoCraft Settings',
            style: 'display: none;',
            align: 'left'
        }).insertAfter('.gamecards_inventorylink');
        jQuery('#autocraft_settings_div').append('<p align="left">'+settingsHead+'</p><p align="left">'+settingsForm+'</p><p align="left">'+settingsRefreshIn+'</p><p align="left">'+settingsCraftRefreshIn+'</p><p align="left">'+settingsIDBlacklist+'</p><p align="left">'+settingsButtonReset+settingsButtonSave+'</form></p>');
        jQuery('#autocraft_settings_form #autocraft_button_reset').click(function(){ resetSettings(); });
        jQuery('#autocraft_settings_form #autocraft_button_save').click(function(){ saveSettings(); });

        if (canCraftBadge == 1){
            invLinks.append('<a><button type="button" class="btn_grey_grey btn_small_thin" id="autocraft"><span>AutoCraft remaining badges</span></button></a>');
            jQuery('#autocraft').click(function(){ autoCraft(); });
        } else {
            invLinks.append('<a><button type="button" class="btn_disabled btn_grey_grey btn_small_thin" id="autocraft" disabled><span>AutoCraft remaining badges</span></button></a>');
        }

        // Settings button
        jQuery('<a><button type="button" class="btn_grey_grey btn_small_thin" id="autocraft_settings"><span>&#9881;</span></button></a>').insertAfter('#autocraft');
        jQuery('#autocraft_settings').click(function(){ toggleSettings(); });
        return;
    }

    // Add button to badges page
    if (isBadgesPage === 1){
        // Add settings div
        jQuery('<div/>', {
            id: 'autocraft_settings_div',
            class: 'badge_details_set_favorite',
            title: 'Steam-AutoCraft Settings',
            style: 'display: none;',
            align: 'left'
        }).insertAfter('.badge_details_set_favorite');
        jQuery('#autocraft_settings_div').append('<p align="left">'+settingsHead+'</p><p align="left">'+settingsForm+'</p><p align="left">'+settingsRefreshIn+'</p><p align="left">'+settingsCraftRefreshIn+'</p><p align="left">'+settingsIDBlacklist+'</p><p align="left">'+settingsButtonReset+settingsButtonSave+'</form></p>');
        jQuery('#autocraft_settings_form #autocraft_button_reset').click(function(){ resetSettings(); });
        jQuery('#autocraft_settings_form #autocraft_button_save').click(function(){ saveSettings(); });

        if (canCraftBadge == 1){
            badgeLinks.append('<a><button type="button" class="btn_grey_black btn_small_thin" id="autocraft"><span>AutoCraft remaining badges</span></button></a>');
            checkBlacklist();

            // Detect execution from page other than 1 and disable
            if (jQuery('.pageLinks .pagelink').filter('a[href="?p=1"]').length >= 1) {
                jQuery('#autocraft').addClass('btn_disabled');
                jQuery('#autocraft').click(function(){ alert("Please execute from page 1."); });
            } else {
                jQuery('#autocraft').click(function(){ window.sessionStorage.craftRecursive = 1; window.location.href = gamecardHref; });
            }
        } else {
            badgeLinks.append('<div class="btn_disabled btn_grey_black btn_small_thin" id="autocraft"><span>AutoCraft remaining badges</span></div>');
        }

        // Settings button
        jQuery('<div class="btn_grey_black btn_small_thin" id="autocraft_settings"><span>&#9881;</span></div>').insertAfter('#autocraft');
        jQuery('#autocraft_settings').click(function(){ toggleSettings(); });
        jQuery('#autocraft_button_reset').removeClass('btn_grey_grey');
        jQuery('#autocraft_button_reset').addClass('btn_grey_black');
        jQuery('#autocraft_button_save').removeClass('btn_grey_grey');
        jQuery('#autocraft_button_save').addClass('btn_grey_black');
        return;
    }
}

// Auto-craft
function autoCraft() {
    craftBadge();
    setTimeout(function(){ checkBadge(); window.location.reload(true); }, pageRefreshTimeoutms);
    window.sessionStorage.autoCraftState = 1;
}

// Check settings
function checkSettings() {
    // Use localStorage for persistence across browser sessions
    if (window.localStorage.pageRefreshTimeoutms) {
        pageRefreshTimeoutms = window.localStorage.pageRefreshTimeoutms;
    }

    if (window.localStorage.craftRefreshTimeoutms) {
        craftRefreshTimeoutms = window.localStorage.craftRefreshTimeoutms;
    }

    if (window.localStorage.gameIdBlackList) {
        gameIdBlackList = window.localStorage.gameIdBlackList;
    }
}

// Check blacklist
function checkBlacklist() {
    // Join csv blacklist with pipe for use inside regex
    var blacklist = gameIdBlackList.replace(/,/g, '|');
    var regex     = "^http[s]?:\/\/steamcommunity.com\/id\/.+\/gamecards\/"+blacklist+"\/.*$";
    var re        = new RegExp(regex);

    // Get first badge link
    gamecardHref = jQuery('div').find('.badge_row a.badge_row_overlay').attr('href');
    // Check for match
    while (gamecardHref.match(re)) {
        // Disable badge link
        jQuery('a[href="'+gamecardHref+'"]').remove();
        // Find next
        gamecardHref = jQuery('div').find('.badge_row .badge_row_overlay').attr('href');
    }

    // Redirect or clean up
    if ((gamecardHref.length >= 1) && (jQuery('a[href$="'+gamecardHref+'"]').filter('.badge_craft_button').length >= 1)) {
        redirect = 1;
    } else {
        delete window.sessionStorage.craftRecursive;
        jQuery('#autocraft').addClass('btn_disabled');
        jQuery('#autocraft').prop("disabled",true);
    }
}

// Craft badge and refresh page
function craftBadge() {
    jQuery('.badge_craft_button').click();
    setTimeout(function(){ window.location.reload(true); }, craftRefreshTimeoutms);
}


// Reset settings
function resetSettings() {
    var resetConfirm = confirm("Reset all settings?");
    if (resetConfirm === true) {
        pageRefreshTimeoutms  = pageRefreshTimeoutmsDef;
        delete window.localStorage.pageRefreshTimeoutms;
        jQuery('#autocraft_setting_refresh_timeout').val( pageRefreshTimeoutmsDef );

        craftRefreshTimeoutms = craftRefreshTimeoutmsDef;
        delete window.localStorage.craftRefreshTimeoutms;
        jQuery('#autocraft_setting_craft_refresh_timeout').val( craftRefreshTimeoutmsDef );

        gameIdBlackList = '';
        delete window.localStorage.gameIdBlackList;
        jQuery('#autocraft_setting_blacklist').val( gameIdBlackList );

        toggleSettings();
        window.location.reload(true);
    }
}

// Save settings
function saveSettings() {
    var problemState  = 0;
    var settingsArray = jQuery('#autocraft_settings_form').serializeArray();

    jQuery.each(settingsArray, function (i, setting) {
        if (setting.name === 'autocraft_setting_refresh_timeout') {
            // Ensure that only integers are entered
            if (setting.value.match(/^[0-9]+$/)) {
                pageRefreshTimeoutms                     = setting.value;
                window.localStorage.pageRefreshTimeoutms = setting.value;
            } else {
                alert("Invalid input: "+setting.value+", 'Page Refresh Timeout (ms)' requires an integer!");
                problemState = 1;
            }
        }

        if (setting.name === 'autocraft_setting_craft_refresh_timeout') {
            // Ensure that only integers are entered
            if (setting.value.match(/^[0-9]+$/)) {
                craftRefreshTimeoutms                     = setting.value;
                window.localStorage.craftRefreshTimeoutms = setting.value;
            } else {
                alert("Invalid input: "+setting.value+", 'Craft Refresh Timeout (ms)' requires an integer!");
                problemState = 1;
            }
        }

        if (setting.name === 'autocraft_setting_blacklist') {
            // Allow only integers and commas
            if ((setting.value.match(/^[0-9,]+$/)) || (setting.value === '')) {
                gameIdBlackList                     = setting.value;
                window.localStorage.gameIdBlackList = setting.value;
            } else {
                alert("Invalid input: "+setting.value+", 'Game ID Blacklist (id1,id2)' requires an integer with optional comma!");
                problemState = 1;
            }
        }
    });

    if (problemState === 0) {
        toggleSettings();
        window.location.reload(true);
    }
}

// Settings toggle
function toggleSettings() {
    // Toggle the settings
    jQuery('#autocraft_settings_div').toggle();

    // Change look on view
    if (jQuery('#autocraft_settings_div').is(':visible')) {
        jQuery('#autocraft_settings').addClass('btn_disabled');
    } else {
        jQuery('#autocraft_settings').removeClass('btn_disabled');
    }
}
