frappe.provide("sidebar_app");

// Load sidebar_app.js immediately to ensure workspace overrides are available
frappe.require([
	"/assets/sidebar_app/js/sidebar_app.js"
]);

// [Option A] Injection into List/Form sidebars disabled to prevent duplicate sidebar issues.
sidebar_app.lazy_load = function() {
	return Promise.resolve();
};

