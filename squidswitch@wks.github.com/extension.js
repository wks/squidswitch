const St = imports.gi.St;
const Mainloop = imports.mainloop;

const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Lang = imports.lang;

const Main = imports.ui.main;

////////////////// D-Bus and Proxies

const DBus = imports.dbus;

const NotificationRemoteInterface = {
    name: 'org.freedesktop.Notifications', 
    methods: [
        {
            name: 'Notify',
            inSignature: 'susssasa{sv}i',
            outSignature: 'u'
        }
    ]
};
let NotificationProxy = DBus.makeProxyClass(NotificationRemoteInterface);

const SystemdUnitInterface = {
    name: 'org.freedesktop.systemd1.Unit',
    methods: [
        {
            name: 'Start',
            inSignature: 's',
            outSignature: 'o'
        },
        {
            name: 'Stop',
            inSignature: 's',
            outSignature: 'o'
        }
    ],
    properties: [
        {
            name: 'ActiveState'
        }
    ]
};
let SystemdUnitProxy = DBus.makeProxyClass(SystemdUnitInterface);

let notification_proxy = new NotificationProxy(
        DBus.session,
        'org.freedesktop.Notifications',
        '/org/freedesktop/Notifications');

let squid_proxy = new SystemdUnitProxy(
        DBus.system,
        'org.freedesktop.systemd1',
        '/org/freedesktop/systemd1/unit/squid_2eservice');

function startSquid() {
    squid_proxy.StartRemote("replace");
}

function stopSquid() {
    squid_proxy.StopRemote("replace");
}

function getSquidActiveState(func) {
    squid_proxy.GetRemote("ActiveState", func);
}

///////////////// Panel icon

function SquidSwitch() {
    this._init.apply(this, arguments);
}

SquidSwitch.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
	
    _init: function(){
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'user-bookmarks', 'Squid Switch');

        this.squidStatusItem = new PopupMenu.PopupMenuItem("(unknown)");
        this.menu.addMenuItem(this.squidStatusItem);

        this.switchWidget = new PopupMenu.PopupSwitchMenuItem("Switch", false);
        this.menu.addMenuItem(this.switchWidget);

        this.switchWidget.connect('toggled', Lang.bind(this, function(item, state) {
            if (state) {
                startSquid();
            } else {
                stopSquid();
            }
        }));

        this.menu.connect('open-state-changed', Lang.bind(this, function(item, state) {
            if (state) {
                this.squidStatusItem.label.text = "Loading systemd status...";
                getSquidActiveState(Lang.bind(this, function (squid_state) {
                    this.squidStatusItem.label.text = squid_state;
                }));
            }
        }));
    }
};

function main() {
    Panel.STANDARD_TRAY_ICON_ORDER.unshift('squidswitch');
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['squidswitch'] = SquidSwitch;
}
