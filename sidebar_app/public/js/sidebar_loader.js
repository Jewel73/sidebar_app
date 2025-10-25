frappe.provide("sidebar_app");

// Load sidebar_app.js immediately to ensure workspace overrides are available
frappe.require([
	"/assets/sidebar_app/js/sidebar_app.js"
]);

sidebar_app.lazy_load = function() {
	if (sidebar_app._loaded) {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		frappe.require([
			"/assets/sidebar_app/js/workspace_menu_injector.js"
		], () => {
			sidebar_app._loaded = true;
			resolve();
		});
	});
};

frappe.router.on("change", () => {
	const route = frappe.get_route();
	if (!route || !route.length) return;

	const needs_sidebar = route[0] === "List" ||
	                     route[0] === "Form" ||
	                     route[0] === "Workspaces" ||
	                     route[0] === "query-report";

	if (needs_sidebar) {
		sidebar_app.lazy_load();
	}
});

$(document).ready(() => {
	const route = frappe.get_route();
	if (!route || !route.length) return;

	const needs_sidebar = route[0] === "List" ||
	                     route[0] === "Form" ||
	                     route[0] === "Workspaces" ||
	                     route[0] === "query-report";

	if (needs_sidebar) {
		sidebar_app.lazy_load();
	}
});
