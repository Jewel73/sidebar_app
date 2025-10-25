/**
 * Workspace Menu Injector
 * Injects the PUBLIC workspace menu into List/Form/Report sidebars
 */

frappe.provide("sidebar_app");

sidebar_app.WorkspaceMenuInjector = class {
	constructor() {
		this.workspace_items = null;
		this.init();
	}

	init() {
		console.log("WorkspaceMenuInjector initializing...");
		
		// Setup event listeners IMMEDIATELY (before loading items)
		// This ensures the override happens before any ListView is created
		this.setup_event_listeners();
		
		// Load workspace items in parallel
		this.load_workspace_items().then(() => {
			console.log("Workspace items loaded:", this.workspace_items?.length || 0, "items");
		});
	}

	setup_event_listeners() {
		// Store reference to this for use in overrides
		const self = this;
		
		console.log("Setting up event listeners...");
		console.log("frappe.views.BaseList available:", !!frappe.views.BaseList);
		
		// Override BaseList.prototype.setup_side_bar to inject menu right after sidebar is created
		const OriginalBaseList = frappe.views.BaseList;
		if (OriginalBaseList && OriginalBaseList.prototype) {
			console.log("Overriding BaseList.prototype.setup_side_bar");
			const original_setup_side_bar = OriginalBaseList.prototype.setup_side_bar;
			OriginalBaseList.prototype.setup_side_bar = function() {
				console.log("BaseList.setup_side_bar called");
				
				// Call original setup_side_bar first
				const result = original_setup_side_bar.call(this);
				
				// Inject menu right after sidebar is set up
				// Use setTimeout to ensure DOM is fully ready
				setTimeout(() => {
					console.log("Sidebar setup completed - injecting menu");
					self.inject_into_list_sidebar();
				}, 100);
				
				return result;
			};
			
			// Also override refresh to handle subsequent refreshes
			const original_refresh = OriginalBaseList.prototype.refresh;
			OriginalBaseList.prototype.refresh = function() {
				console.log("BaseList.refresh called");
				const promise = original_refresh.call(this);
				
				// After refresh completes, trigger our event
				if (promise && promise.then) {
					promise.then(() => {
						// Use setTimeout to ensure after_render has completed
						setTimeout(() => {
							console.log("List view refresh completed - injecting menu");
							self.inject_into_list_sidebar();
						}, 100);
					});
				}
				
				return promise;
			};
		} else {
			console.error("Could not find frappe.views.BaseList");
		}

		// Listen to form-refresh event (fired after sidebar is created)
		$(document).on("form-refresh", (e, frm) => {
			console.log("form-refresh event fired");
			this.inject_into_form_sidebar(frm);
		});
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
		// Find only the visible/active list sidebar
		let $sidebar = $(".list-sidebar:visible");
		
		// Fallback to any list sidebar if none visible
		if (!$sidebar.length) {
			$sidebar = $(".list-sidebar").last(); // Get the most recent one
		}
		
		console.log("inject_into_list_sidebar: Sidebar found:", $sidebar.length);
		
		if (!$sidebar.length) {
			console.log("List sidebar not found");
			return;
		}

		// Check if menu is already in DOM (most reliable check)
		const existing_menu = $sidebar.find(".workspace-menu-section");
		console.log("inject_into_list_sidebar: Existing menu count:", existing_menu.length);
		
		if (existing_menu.length) {
			console.log("List sidebar already has menu in DOM");
			// Verify it's visible
			const is_visible = existing_menu.is(":visible");
			console.log("Menu visibility:", is_visible);
			if (!is_visible) {
				console.log("Menu exists but is hidden - forcing visibility");
				existing_menu.show().css('display', 'block');
				const $parent = existing_menu.closest(".sidebar-menu");
				$parent.removeClass('hide').show();
				const $workspace_section = existing_menu.closest(".workspace-menu-section");
				$workspace_section.show().css('display', 'block');
				console.log("Visibility forced - checking again:", existing_menu.is(":visible"));
			}
			return;
		}

		console.log("Attempting to inject menu into list sidebar...");
		console.log("Workspace items available:", this.workspace_items?.length || 0);

		// Workspace items should already be loaded at this point
		if (this.workspace_items && this.workspace_items.length > 0) {
			this.render_menu($sidebar, "list");
			console.log("Menu injection completed");
		} else {
			console.warn("Workspace items not loaded yet, loading and retrying...");
			// Fallback: if items not loaded, wait and retry
			this.load_workspace_items().then(() => {
				console.log("Workspace items loaded, retrying injection");
				if (!$sidebar.find(".workspace-menu-section").length) {
					this.render_menu($sidebar, "list");
				}
			});
		}
	}

	inject_into_form_sidebar(frm) {
		if (!frm || !frm.page) {
			console.log("Form or page not found");
			return;
		}

		// Find the actual .form-sidebar element
		const $form_sidebar = frm.page.sidebar.find(".form-sidebar");
		if (!$form_sidebar.length) {
			console.log("Form sidebar element not found");
			return;
		}

		// Check if menu is already in DOM
		if ($form_sidebar.find(".workspace-menu-section").length) {
			console.log("Form sidebar already has menu in DOM");
			return;
		}

		console.log("Found form sidebar, injecting menu...");

		// Workspace items should already be loaded at this point
		if (this.workspace_items && this.workspace_items.length > 0) {
			this.render_menu($form_sidebar, "form");
		} else {
			console.warn("Workspace items not loaded yet for form, loading and retrying...");
			// Fallback: if items not loaded, wait and retry
			this.load_workspace_items().then(() => {
				if (!$form_sidebar.find(".workspace-menu-section").length) {
					this.render_menu($form_sidebar, "form");
				}
			});
		}
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
		// Store instance globally for access in overridden methods
		sidebar_app.WorkspaceMenuInjector.instance = new sidebar_app.WorkspaceMenuInjector();
	} else {
		// Fallback: wait a bit and try again
		setTimeout(() => {
			sidebar_app.WorkspaceMenuInjector.instance = new sidebar_app.WorkspaceMenuInjector();
		}, 1000);
	}
});

console.log("Sidebar App: Workspace Menu Injector loaded");