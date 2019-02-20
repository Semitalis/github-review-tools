// ==UserScript==
// @name         GitHub Review Tools
// @description  Extensions to make the reviewing process in GitHub a little more acceptable.
// @include      http*://*git*/*
// @license      MIT
// @author       Semitalis
// @namespace    https://github.com/Semitalis/
// @version      1.0
// @homepage     https://github.com/Semitalis/github-review-tools
// @downloadURL  https://raw.githubusercontent.com/Semitalis/github-review-tools/master/github_review_tools.user.js
// @updateURL    https://raw.githubusercontent.com/Semitalis/github-review-tools/master/github_review_tools.user.js
// @require      https://code.jquery.com/jquery-3.3.1.min.js#sha256=FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=
// @require      http://code.jquery.com/jquery-latest.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
/*
Changelog:
1.0:
- initial version
*/

var $ = window.jQuery;

// UTILS
var semi_utils = {
    storage : (function(){
        return {
            save : function (key, value){
                GM_setValue(key, value);
            },
            load : function (key, def){
                return GM_getValue(key, def);
            }
        };
    }())
};

// MAIN
$(document).ready(function() {
    'use strict';

    // PRIVATE VARIABLES
    var m = {
        debug    : false,
        settings : {
            auto_collapse : semi_utils.storage.load('grt_auto_collapse', false),
        }
    };

    // PRIVATE METHODS
    var f = {
        log : function(s){
            if(m.debug){
                console.log(s);
            }
        },
        collapseAll : function(){
            $('button[class*="details"][aria-expanded=true]').each(function(i){$(this).click();});
        },
        expandAll : function(){
            $('button[class*="details"][aria-expanded=false]').each(function(i){$(this).click();});
        },
        add_tools : function(){
            // do this just once
            if (document.body.grt_tools_added === true) {
                return;
            }
            $('div[class*="pr-review-tools"]').each(function(){
                document.body.grt_tools_added = true;

                // tools button markup
                var s = '<details class="diffbar-item details-reset details-expanded position-relative text-center">'
                + '  <summary class="btn btn-sm">Tools <div class="dropdown-caret v-align-text-bottom"></div></summary>'
                + '  <div class="Popover js-diff-settings mt-2 pt-1" style="left: -86px">'
                + '    <div class="Popover-message text-left p-3 mx-auto Box box-shadow-large">'
                + '      <h4 class="mb-2">Just for now</h4>'
                + '        <label class="btn btn-sm text-center" id="grt_btn_collapse_all">Collapse all</label>'
                + '        <label class="btn btn-sm text-center" id="grt_btn_expand_all">Expand all</label>'
                + '      <h4 class="mb-2 mt-3">General settings</h4>'
                + '        <input type="checkbox" name="w" value="1" id="grt_auto_collapse"' + (m.settings.auto_collapse ? ' checked' : '') + '>'
                + '        <label for="whitespace-cb" class="text-normal">Auto collapse on load</label>'
                + '    </div>'
                + '  </div>'
                + '</details>';

                // add it
                var html = $(this).html();
                $(this).html(s + html);

                // attach event handlers
                $('#grt_btn_collapse_all').click(f.collapseAll);
                $('#grt_btn_expand_all').click(f.expandAll);
                $('#grt_auto_collapse').click(function(){
                    m.settings.auto_collapse = this.checked;
                    semi_utils.storage.save('grt_auto_collapse', this.checked);
                });
            });
        },
        check : function(nodes){
            var node, el;

            // add our tools button if not already done so
            f.add_tools();

            // gating since we only check for collapsable elements
            if (m.settings.auto_collapse !== true) {
                return;
            }

            // recursive check of all children nodes
            for(node of nodes){
                f.check(node.childNodes);

                // check all buttons
                if (node.nodeName === 'BUTTON') {
                    // verify selectors
                    el = $(node).filter('[class*="details"]');
                    if (el.length !== 1) {
                        continue;
                    }

                    // auto collapse just once
                    if(node.grt_auto_collapsed === true){
                        return;
                    }
                    node.grt_auto_collapsed = true;

                    // auto collapse
                    if (el.attr('aria-expanded') !== true) {
                        el.click();
                    }
                }
            }
        },
        init : function(){
            // do this just once
            if (document.body.grt_init === true) {
                return;
            }
            document.body.grt_init = true;

            // setup observer for new DOM elements
            m.observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    f.check(mutation.addedNodes);
                });
            });
            m.observer.observe(document.body, { childList: true, subtree: true });

            // check already existing DOM elements
            f.check(document.body.childNodes);

            // all setup
            f.log("[GRT] initialized.");
        }
    };

    // initialize framework
    f.init();
});
