// ==UserScript==
// @name         GitHub Review Tools
// @description  Extensions to make the reviewing process in GitHub a little more acceptable.
// @include      http*://*git*/*
// @license      MIT
// @author       Semitalis
// @namespace    https://github.com/Semitalis/
// @version      1.2
// @homepage     https://github.com/Semitalis/github-review-tools
// @downloadURL  https://raw.githubusercontent.com/Semitalis/github-review-tools/master/github_review_tools.user.js
// @updateURL    https://raw.githubusercontent.com/Semitalis/github-review-tools/master/github_review_tools.user.js
// @require      https://code.jquery.com/jquery-3.3.1.min.js#sha256=FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
/*
Changelog:
1.2:
- optimized performance
- fixed tools not showing when switching between different diff views
- added bottom toolbar to file details
1.1:
- now the tools get added with individual commit ranges as well
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
        debug          : false,
        unique_id      : 0,
        toolbar_height : 200,
        current_page   : null,
        check_timer    : null,
        settings       : {
            auto_collapse : semi_utils.storage.load('grt_auto_collapse', false),
            remember      : semi_utils.storage.load('grt_remember', true),
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
            $('div[id="files"]').find('button[class*="details"][aria-expanded="true"]').each(function(){$(this).click();});
        },
        expandAll : function(){
            $('div[id="files"]').find('button[class*="details"][aria-expanded="false"]').each(function(){$(this).click();});
        },
        add_tools : function(){
            $('div[class*="pr-review-tools"]').each(function(){
                var tool_bar = $(this);

                // add the tools menu once
                if (tool_bar.attr('grt_tools_added') !== 'yes') {
                    tool_bar.attr('grt_tools_added', 'yes');

                    // tools button markup
                    tool_bar.prepend('<details class="diffbar-item details-reset details-expanded position-relative text-center">'
                        + '  <summary class="btn btn-sm">Tools <div class="dropdown-caret v-align-text-bottom"></div></summary>'
                        + '  <div class="Popover js-diff-settings mt-2 pt-1" style="left: -86px">'
                        + '    <div class="Popover-message text-left p-3 mx-auto Box box-shadow-large">'
                        + '      <h4 class="mb-2">Just for now</h4>'
                        + '        <label class="btn btn-sm text-center" id="grt_btn_collapse_all">Collapse all</label>'
                        + '        <label class="btn btn-sm text-center" id="grt_btn_expand_all">Expand all</label>'
                        + '      <h4 class="mb-2 mt-3">General settings</h4>'
                        + '        <input type="checkbox" value="1" id="grt_auto_collapse"' + (m.settings.auto_collapse ? ' checked' : '') + '>'
                        + '        <label for="whitespace-cb" class="text-normal">Auto collapse on load</label>'
                        // TODO
                        //+ '        <br/><input type="checkbox" value="1" id="grt_remember"' + (m.settings.remember ? ' checked' : '') + '>'
                        //+ '        <label for="whitespace-cb" class="text-normal">Remember collapse state</label>'
                        + '    </div>'
                        + '  </div>'
                        + '</details>');
                }

                // always (re-)attach event handlers
                $('#grt_btn_collapse_all').click(f.collapseAll);
                $('#grt_btn_expand_all').click(f.expandAll);
                $('#grt_auto_collapse').click(function(){
                    m.settings.auto_collapse = this.checked;
                    semi_utils.storage.save('grt_auto_collapse', this.checked);
                });
                $('#grt_remember').click(function(){
                    m.settings.remember = this.checked;
                    semi_utils.storage.save('grt_remember', this.checked);
                });
            });
        },
        on_page_change : function(){
            f.add_tools();
        },
        on_auto_stuff : function(){;
            // fetch all file nodes
            var files = $('div[id="files"]').find('div[id*="diff"]').each(function(){
                var file = $(this);

                // unique id
                if (file.attr('grt_uid_set') !== 'yes') {
                    file.attr('grt_uid_set', 'yes').attr('grt_uid', m.unique_id++);
                }
                var uid = file.attr('grt_uid');

                // iterate header
                file.children('[class*="file-header"]').each(function(){
                    var header = $(this);
                    var uid_s = 'grt_file_header_' + uid;

                    // add additional toolbar at the top
                    if (header.attr('grt_toolbar') !== 'yes') {
                        header.attr('grt_toolbar', 'yes');

                        header.find('a[aria-label*="View"]').after(
                            '&nbsp;<label class="btn btn-sm text-center" id="' + uid_s + '_top">Top</label>'
                        );
                    }

                    // always (re-)attach event handlers
                    $('#' + uid_s + '_top').click(function(){
                        window.scrollTo(0, 0);
                    });

                    // auto collapse file details
                    if ((m.settings.auto_collapse === true) && (header.attr('grt_auto_collapsed') !== 'yes')) {
                        header.attr('grt_auto_collapsed', 'yes');
                        header.find('button[aria-expanded=true]').click();
                    }
                });

                // iterate content
                file.children('div[class*="Details-content"]').each(function(){
                    var content = $(this);
                    var uid_s = 'grt_file_content_' + uid;

                    // add additional toolbar at the bottom
                    if (content.attr('grt_toolbar') !== 'yes') {
                        content.attr('grt_toolbar', 'yes');

                        // toolbar html
                        content.append('<div style="position: absolute; right: 0; bottom: 0">'
                            + '<label class="btn btn-sm text-center grt_btn-transparent" id="' + uid_s + '_collapse">Collapse</label>&nbsp;'
                            + '<label class="btn btn-sm text-center grt_btn-transparent" id="' + uid_s + '_top">Top</label>'
                            + '</div>');

                    }

                    // always (re-)attach event handlers
                    $('#' + uid_s + '_collapse').off().on('click', function(){
                        var el = $(this).parent().parent().parent().find('button[aria-expanded=true]');
                        $('html, body').stop().animate({scrollTop: (el.offset().top - m.toolbar_height)}, 300, 'swing', function(){
                            $('[grt_uid="' + uid + '"]').find('button[aria-expanded=true]').click();
                        });
                    });
                    $('#' + uid_s + '_top').off().on('click', function(){
                        window.scrollTo(0, 0);
                    });
                });
            });
        },
        on_check : function(nodes){
            var s = document.location.href

            // whenever the page changes
            if(m.current_page !== s){
                m.current_page = s;
                f.on_page_change();
            }

            // do certain things depending on settings
            f.on_auto_stuff();
        },
        on_dom_change : function(){
            clearTimeout(m.check_timer);
            m.check_timer = setTimeout(function(){
                m.check_timer = null;
                f.on_check();
              }, 250);
        },
        init_css : function(){
            $('<style>'
                + '.grt_btn-transparent { opacity: 0.5; }'
                + '.grt_btn-transparent:hover { opacity: 1.0; transition: opacity .4s ease-in-out; }'
            + '</style>').appendTo('body');
        },
        init : function(){
            // do this just once
            if (document.body.grt_init === true) {
                return;
            }
            document.body.grt_init = true;

            // add own CSS styles
            f.init_css();

            m.toolbar_height = $('[class*="pr-toolbar"]').height() + 20;

            // setup observer for new DOM elements
            m.observer = new MutationObserver(function(mutations) {
                mutations.forEach(function() {
                    f.on_dom_change();
                });
            });
            m.observer.observe(document.body, {
                childList  : true,
                attributes : true,
                subtree    : true
            });

            // trigger check for already existing elements
            f.on_dom_change();

            // all setup
            f.log("[GRT] initialized.");
        }
    };

    // actual ready handler as return value
    return f.init;
}());
