import '../styles/d3-context-menu.css';
import {mouse, select, selectAll} from 'd3-selection';
import slugid from 'slugid';

export function contextMenu(menu, opts) {
    let previouslyMouseUp = false;
    let clickAway = {};
    let uid = slugid.nice();
    let rootElement = null;
    let orientation = 'right';   // display the menu to the right of the mouse click
                                 // or parent elemement
    let initialPos = null;
    let parentStart = null;

    var openCallback,
        closeCallback;

    if (typeof opts === 'function') {
        openCallback = opts;
    } else {
        opts = opts || {};
        openCallback = opts.onOpen;
        closeCallback = opts.onClose;
    }

    if ('rootElement' in opts)
        rootElement = opts['rootElement']

    if ('pos' in opts) {
        // do we want to place this menu somewhere specific?
        initialPos = opts.pos;
    }

    if ('orientation' in opts) {
        orientation = opts.orientation;
    }

    if ('parentStart' in opts) {
        parentStart = opts.parentStart;
    }

    // create the div element that will hold the context menu
    selectAll('.d3-context-menu-' + uid).data([1])
        .enter()
        .append('div')
        .classed('d3-context-menu', true)
        .classed('d3-context-menu-' + uid, true)

    // close menu
    select('body').on('click.d3-context-menu-' + uid, function() {
        /*
        if (previouslyMouseUp) {
            previouslyMouseUp = false;
            return;
        }
        */
       // console.log('body click close');

        select('.d3-context-menu-' + uid).style('display', 'none');
       orientation = 'right';

        if (closeCallback) {
            closeCallback();
        }
    });

    // this gets executed when a contextmenu event occurs
    return function(data, index, pMouseUp=false,
                    clickAwayFunc = function() { }, useMouse = false ) {
        var elm = this;
        var contextMenuPos = null;
        let mousePos = null;
        let currentThis = this;

        if (useMouse) {
            if (rootElement == null)
                mousePos = mouse(this);
            else
                mousePos = mouse(rootElement); // for recursive menus, we need the mouse
            // position relative to another element
        }

        clickAway = clickAwayFunc;
        let openChildMenuUid = null;

        previouslyMouseUp = pMouseUp;

        selectAll('.d3-context-menu-' + uid).html('');
        var list = selectAll('.d3-context-menu-' + uid)
            .on('contextmenu', function(d) {
                console.log('context-menu close');
                select('.d3-context-menu-' + uid).style('display', 'none');
                orientation = 'right';

                d3.event.preventDefault();
                d3.event.stopPropagation();
            })
            .append('ul');

        list.selectAll('li').data(typeof menu === 'function' ? menu(data) : menu).enter()
            .append('li')
            .attr('class', function(d) {
                // console.log('d:', d);
                var ret = '';
                if (d.divider) {
                    ret += ' is-divider';
                }
                if (d.disabled) {
                    ret += ' is-disabled';
                }
                if (!d.action) {
                    ret += ' is-header';
                }
                if ('children' in d) {
                    ret += ' d3-context-menu-recursive';
                }
                return ret;
            })
            .html(function(d) {
                if (d.divider) {
                    return '<hr>';
                }
                if (!d.title) {
                    console.error('No title attribute set. Check the spelling of your options.');
                }
                return (typeof d.title === 'string') ? d.title : d.title(data);
            })
            .on('click', function(d, i) {
                if (d.disabled) return; // do nothing if disabled
                if (!d.action) return; // headers have no "action"
                d.action(elm, data, index, mousePos);
                // console.log('click close');

                // close all context menus
                selectAll('.d3-context-menu').style('display', 'none');
                orientation = 'right';

                if (closeCallback) {
                    closeCallback();
                }
            })
            .on('mouseenter', function(d, i) {
                select(this)
                    .classed('d3-context-menu-selected', true)

                if (openChildMenuUid != null) {
                    // there's a child menu open

                    // unselect all items
                    select('.d3-context-menu-' + uid)
                        .selectAll('li')
                        .classed('d3-context-menu-selected', false);

                    if (typeof d.children == 'undefined') {
                        // console.log("no children close");
                        // no children, so hide any open child menus
                        select('.d3-context-menu-' + openChildMenuUid)
                        .style('display', 'none');

                        openChildMenuUid = null;
                        return;
                    }

                    if (d.childUid == openChildMenuUid) {
                        // the correct child menu is already open
                        return;

                    } else {
                        // need to open a different child menu
                        // console.log('open different child menu close');

                        // close the already open one
                        select('.d3-context-menu-' + openChildMenuUid)
                        .style('display', 'none');

                        openChildMenuUid = null;

                    }
                }

                // there should be no menu open right now
                if (typeof d.children != 'undefined') {
                    let boundingRect = this.getBoundingClientRect();

                    let childrenContextMenu = null
                    if (orientation == 'left') {
                        childrenContextMenu = contextMenu(d.children, {'rootElement': currentThis,
                              'pos': [ boundingRect.left + window.pageXOffset,
                                    boundingRect.top - 2 + window.pageYOffset],
                        'orientation': 'left'});
                    } else {
                        childrenContextMenu = contextMenu(d.children,
                                      {
                                          'pos': [ boundingRect.left + boundingRect.width + window.pageXOffset,
                                                boundingRect.top - 2 + window.pageYOffset],
                                       'rootElement': currentThis,
                                    'parentStart': [boundingRect.left + window.pageXOffset,
                                      boundingRect.top - 2 + window.pageYOffset]});
                    }

                    d.childUid = childrenContextMenu.apply(this, [data,i,true,
                                                           function() { }]);
                    openChildMenuUid = d.childUid;
                }


                select(this)
                    .classed('d3-context-menu-selected', true)

            })
            .on('mouseleave', function(d, i) {

                if (openChildMenuUid == null) {
                    select(this)
                        .classed('d3-context-menu-selected', false);
                }
            });

            list.selectAll('.d3-context-menu-recursive')
                .append('svg')
                .attr('width', '14px')
                .attr('height', '14px')
                .style('position', 'absolute')
                .style('right', '5px')
                    .append('use')
                    .attr('href', '#play');

        // the openCallback allows an action to fire before the menu is displayed
        // an example usage would be closing a tooltip
        if (openCallback) {
            if (openCallback(data, index) === false) {
                return uid;
            }
        }

        let contextMenuSelection = select('.d3-context-menu-' + uid)
            .style('display', 'block');

        if (initialPos == null) {
            select('.d3-context-menu-' + uid)
            .style('left', (d3.event.pageX - 2) + 'px')
            .style('top', (d3.event.pageY - 2) + 'px')
        } else {
            select('.d3-context-menu-' + uid)
            .style('left', initialPos[0] + 'px')
            .style('top', initialPos[1] + 'px')
        }

        // check if the menu disappears off the side of the window
        let boundingRect = contextMenuSelection.node().getBoundingClientRect();

        if (boundingRect.left + boundingRect.width > window.innerWidth || orientation == 'left') {
            orientation = 'left';

            // menu goes of the end of the window, position it the other way
            if (initialPos == null) {
                // place the menu where the user clicked
                select('.d3-context-menu-' + uid)
                .style('left', (d3.event.pageX - 2 - boundingRect.width) + 'px')
                .style('top', (d3.event.pageY - 2) + 'px')
            } else {
                if (parentStart != null) {
                    select('.d3-context-menu-' + uid)
                    .style('left', (parentStart[0] - boundingRect.width) + 'px')
                    .style('top', parentStart[1] + 'px')
                } else {
                    select('.d3-context-menu-' + uid)
                    .style('left', (initialPos[0] - boundingRect.width) + 'px')
                    .style('top', initialPos[1] + 'px')
                }
            }

        }

        // display context menu

        if (previouslyMouseUp)
            return uid;

        d3.event.preventDefault();
        d3.event.stopPropagation();
        //d3.event.stopImmediatePropagation();
        //
        return uid;
    };
};