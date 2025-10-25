/**
 * Workspace Menu Injector
 * Injects the PUBLIC workspace menu into List/Form/Report sidebars
 */

frappe.provide("sidebar_app");

sidebar_app.WorkspaceMenuInjector = class {
	constructor() {
		this.workspace_items = null;
		this.injected_sidebars = new Set(); // Track which sidebars already have the menu
		this.init();
	}

	init() {
		// Load workspace items immediately
		this.load_workspace_items().then(() => {
			console.log("Workspace items loaded:", this.workspace_items?.length || 0, "items");
		});

		// Listen for List View events
		frappe.listview_settings = frappe.listview_settings || {};

		// Override onload for all list views
		const original_onload = frappe.listview_settings.onload;
		frappe.listview_settings.onload = (list_view) => {
			console.log("List view onload fired");
			this.inject_into_list_sidebar();
			if (original_onload) {
				original_onload.call(this, list_view);
			}
		};

		// Listen for sidebar setup events
		$(document).on("list_sidebar_setup", () => {
			console.log("list_sidebar_setup event fired");
			this.inject_into_list_sidebar();
		});

		// Listen to form-refresh event (fired after sidebar is created)
		$(document).on("form-refresh", (e, frm) => {
			console.log("form-refresh event fired");
			this.inject_into_form_sidebar(frm);
		});

		// Use MutationObserver to detect when sidebars are added to DOM
		this.observe_sidebar_changes();
	}

	observe_sidebar_changes() {
		// MutationObserver is disabled because we rely on events:
		// - list_sidebar_setup for List View
		// - form_refresh for Form View
		// This prevents duplicate injections
		console.log("MutationObserver disabled, using event-based injection");
	}

	load_workspace_items() {
		if (this.workspace_items) {
			return Promise.resolve(this.workspace_items);
		}

		return frappe.call({
			method: "frappe.desk.desktop.get_workspace_sidebar_items",
			callback: (r) => {
				if (r.message && r.message.pages) {
					// Filter only public pages
					this.workspace_items = r.message.pages.filter(p => p.public);
					this.workspace_items_loaded = true;
				}
			}
		});
	}

	inject_into_list_sidebar() {
		const $sidebar = $(".list-sidebar");
		if (!$sidebar.length) {
			console.log("List sidebar not found");
			return;
		}

		// Generate unique ID for this sidebar
		const sidebar_id = "list-sidebar";

		// Check if already injected using Set
		if (this.injected_sidebars.has(sidebar_id)) {
			console.log("List sidebar already tracked as injected");
			return;
		}

		// Double check in DOM
		if ($sidebar.find(".workspace-menu-section").length) {
			console.log("List sidebar already has menu in DOM");
			this.injected_sidebars.add(sidebar_id);
			return;
		}

		// Mark as being processed
		this.injected_sidebars.add(sidebar_id);

		// Ensure workspace items are loaded before rendering
		this.load_workspace_items().then(() => {
			if (this.workspace_items && this.workspace_items.length > 0) {
				// Final check before rendering
				if (!$sidebar.find(".workspace-menu-section").length) {
					this.render_menu($sidebar, "list");
				}
			}
		});
	}

	inject_into_form_sidebar(frm) {
		if (!frm || !frm.page) {
			console.log("Form or page not found");
			return;
		}

		// Generate unique ID for this form's sidebar
		const sidebar_id = `form-sidebar-${frm.doctype}-${frm.docname || 'new'}`;

		// Check if already injected
		if (this.injected_sidebars.has(sidebar_id)) {
			console.log("Form sidebar already tracked as injected:", sidebar_id);
			return;
		}

		// Find the actual .form-sidebar element
		const $form_sidebar = frm.page.sidebar.find(".form-sidebar");
		if (!$form_sidebar.length) {
			console.log("Form sidebar element not found");
			return;
		}

		// Double check in DOM
		if ($form_sidebar.find(".workspace-menu-section").length) {
			console.log("Form sidebar already has menu in DOM");
			this.injected_sidebars.add(sidebar_id);
			return;
		}

		// Mark as being processed
		this.injected_sidebars.add(sidebar_id);

		console.log("Found form sidebar, injecting menu...", sidebar_id);

		// Ensure workspace items are loaded before rendering
		this.load_workspace_items().then(() => {
			if (this.workspace_items && this.workspace_items.length > 0) {
				// Final check before rendering
				if (!$form_sidebar.find(".workspace-menu-section").length) {
					this.render_menu($form_sidebar, "form");
				}
			}
		});
	}

	render_menu($container, context) {
		console.log("render_menu called, context:", context);
		console.log("Container:", $container.length, "items:", this.workspace_items?.length || 0);

		if (!this.workspace_items || this.workspace_items.length === 0) {
			console.warn("No workspace items to render!");
			return;
		}

		// Build hierarchical structure
		const root_items = this.workspace_items.filter(item => !item.parent_page);
		const child_items_map = {};

		this.workspace_items.forEach(item => {
			if (item.parent_page) {
				if (!child_items_map[item.parent_page]) {
					child_items_map[item.parent_page] = [];
				}
				child_items_map[item.parent_page].push(item);
			}
		});

		console.log("Root items:", root_items.length);

		// Create menu HTML
		const menu_html = this.build_menu_html(root_items, child_items_map);

		// Create section
		const $section = $(`
			<div class="sidebar-section workspace-menu-section">
				<div class="sidebar-label workspace-menu-header">
					<span>${frappe.utils.icon("menu", "sm")}</span>
					<span style="margin-left: 8px; font-weight: 600;">${__("Quick Access")}</span>
				</div>
				<ul class="list-unstyled workspace-menu-list">
					${menu_html}
				</ul>
			</div>
		`);

		// Inject at the beginning of the sidebar
		if (context === "list") {
			const $target = $container.find(".sidebar-menu").first();
			console.log("Injecting into list sidebar, target found:", $target.length);
			if ($target.length) {
				$section.prependTo($target);
				// Remove 'hide' class from the parent ul to make it visible
				$target.removeClass('hide');
				console.log("Menu injected successfully! Removed 'hide' class.");
			} else {
				console.warn("Target .sidebar-menu not found!");
			}
		} else if (context === "form") {
			// For form sidebar, inject before the first .sidebar-menu
			const $target = $container.find(".sidebar-menu").first();
			console.log("Injecting into form sidebar, target found:", $target.length);
			if ($target.length) {
				$section.insertBefore($target);
				console.log("Menu injected successfully into form!");
			} else {
				// Fallback: prepend to container
				console.log("No .sidebar-menu found, prepending to container");
				$section.prependTo($container);
			}
		} else {
			console.log("Injecting into generic sidebar");
			$section.prependTo($container);
			console.log("Menu injected successfully!");
		}

		// Add click handlers
		this.attach_click_handlers($section);
	}

	build_menu_html(items, child_items_map, level = 0) {
		let html = "";

		items.forEach(item => {
			const has_children = child_items_map[item.title] && child_items_map[item.title].length > 0;
			const icon = item.icon || "link-url";
			const url = this.get_item_url(item);
			const indent_style = level > 0 ? `style="padding-left: ${level * 16 + 8}px;"` : "";

			html += `
				<li class="workspace-menu-item ${has_children ? 'has-children' : ''}" data-item-title="${item.title}">
					<div class="workspace-menu-item-wrapper">
						<a href="${url}" class="workspace-menu-link" ${indent_style}>
							<span class="workspace-menu-icon">
								${frappe.utils.icon(icon, "sm")}
							</span>
							<span class="workspace-menu-label">${__(item.title)}</span>
						</a>
						${has_children ? `<span class="workspace-menu-toggle">${frappe.utils.icon("es-line-down", "sm")}</span>` : ''}
					</div>
				</li>
			`;

			// Add children recursively
			if (has_children) {
				html += `<div class="workspace-menu-children" data-parent="${item.title}" style="display: none;">`;
				html += this.build_menu_html(child_items_map[item.title], child_items_map, level + 1);
				html += `</div>`;
			}
		});

		return html;
	}

	get_item_url(item) {
		// If it's a quick link, get the direct URL
		if (item.is_quick_link) {
			switch (item.quick_link_type) {
				case "DocType":
					return `/app/${frappe.router.slug(item.quick_link_to)}`;
				case "Page":
					return `/app/${frappe.router.slug(item.quick_link_to)}`;
				case "Report":
					return `/app/query-report/${frappe.router.slug(item.quick_link_to)}`;
				case "Workspace":
					return `/app/${frappe.router.slug(item.quick_link_workspace)}`;
				case "URL":
					return item.quick_link_url || "#";
				default:
					return "#";
			}
		}

		// Regular workspace
		return `/app/${frappe.router.slug(item.title)}`;
	}

	attach_click_handlers($section) {
		// Handle toggle for items with children (click on the toggle icon only)
		$section.find(".workspace-menu-toggle").on("click", function(e) {
			e.preventDefault();
			e.stopPropagation();

			const $item = $(this).closest(".workspace-menu-item");
			const item_title = $item.data("item-title");
			const $children = $section.find(`.workspace-menu-children[data-parent="${item_title}"]`);
			const $toggle = $(this);

			if ($children.length) {
				// Toggle children visibility
				$children.slideToggle(200);
				$item.toggleClass("expanded");

				// Toggle icon between down (closed) and up (open)
				const current_icon = $toggle.find("use").attr("href");
				const new_icon = current_icon === "#es-line-down" ? "#es-line-up" : "#es-line-down";
				$toggle.find("use").attr("href", new_icon);
			}
		});

		// Handle external URLs (open in new tab)
		$section.find(".workspace-menu-link").on("click", function(e) {
			const href = $(this).attr("href");
			if (href && href.startsWith("http")) {
				e.preventDefault();
				window.open(href, "_blank");
			}
		});
	}
};

// Initialize when document is ready
$(document).ready(() => {
	// Wait for frappe to be fully loaded
	if (frappe && frappe.call) {
		new sidebar_app.WorkspaceMenuInjector();
	} else {
		// Fallback: wait a bit and try again
		setTimeout(() => {
			new sidebar_app.WorkspaceMenuInjector();
		}, 1000);
	}
});

console.log("Sidebar App: Workspace Menu Injector loaded");