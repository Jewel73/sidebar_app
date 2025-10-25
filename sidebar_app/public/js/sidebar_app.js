/**
 * Sidebar App - Quick Links Extension
 * Extends Frappe Workspace to support direct links to DocType, Page, Report, Workspace, and URLs
 */

frappe.provide("frappe.views");

(function() {
	"use strict";

	/**
	 * Build URL based on link type
	 */
	function buildQuickLinkUrl(item) {
		let href = "";
		let target = "_self";

		switch (item.quick_link_type) {
			case "DocType":
				href = `/app/${frappe.router.slug(item.quick_link_to)}`;
				break;

			case "Page":
				href = `/app/${frappe.router.slug(item.quick_link_to)}`;
				break;

			case "Report":
				// Check if it's a query report
				const report_data = frappe.boot.user.all_reports?.find(
					r => r.name === item.quick_link_to
				);
				if (report_data && report_data.report_type === "Report Builder") {
					href = `/app/List/${report_data.ref_doctype}/Report/${item.quick_link_to}`;
				} else {
					href = `/app/query-report/${frappe.router.slug(item.quick_link_to)}`;
				}
				break;

			case "Workspace":
				if (item.quick_link_workspace) {
					// Get workspace info
					const workspace = frappe.workspaces?.[frappe.router.slug(item.quick_link_workspace)];
					if (workspace) {
						href = workspace.public
							? `/app/${frappe.router.slug(item.quick_link_workspace)}`
							: `/app/private/${frappe.router.slug(item.quick_link_workspace)}`;
					} else {
						href = `/app/${frappe.router.slug(item.quick_link_workspace)}`;
					}
				}
				break;

			case "URL":
				href = item.quick_link_url || "#";
				if (item.quick_link_open_new_tab) {
					target = "_blank";
				}
				break;

			default:
				href = "#";
		}

		return { href, target };
	}

	/**
	 * Check if current page matches the quick link
	 */
	function isCurrentQuickLinkPage(item) {
		const currentPath = window.location.pathname;

		switch (item.quick_link_type) {
			case "DocType":
				return currentPath.includes(`/app/${frappe.router.slug(item.quick_link_to)}`);

			case "Page":
				return currentPath === `/app/${frappe.router.slug(item.quick_link_to)}`;

			case "Report":
				return currentPath.includes(`/app/query-report/${frappe.router.slug(item.quick_link_to)}`) ||
					currentPath.includes(`/Report/${item.quick_link_to}`);

			case "Workspace":
				if (item.quick_link_workspace) {
					return currentPath.includes(frappe.router.slug(item.quick_link_workspace));
				}
				return false;

			case "URL":
				return false; // URLs don't have "current page" concept

			default:
				return false;
		}
	}

	// ========================================
	// Override sidebar_item_container
	// ========================================
	const original_sidebar_item_container = frappe.views.Workspace.prototype.sidebar_item_container;

	frappe.views.Workspace.prototype.sidebar_item_container = function(item) {
		// If it's a quick link, render with custom behavior
		if (item.is_quick_link) {
			const { href, target } = buildQuickLinkUrl(item);
			const is_current_page = isCurrentQuickLinkPage(item);

			item.indicator_color = item.indicator_color ||
				this.indicator_colors[Math.floor(Math.random() * 12)];

			return $(`
				<div
					class="sidebar-item-container ${item.is_editable ? "is-draggable" : ""} quick-link-item"
					item-parent="${item.parent_page || ""}"
					item-name="${item.title}"
					item-public="${item.public || 0}"
					item-is-hidden="${item.is_hidden || 0}"
				>
					<div class="desk-sidebar-item standard-sidebar-item ${is_current_page ? 'selected' : ''}">
						<a
							href="${href}"
							target="${target}"
							class="item-anchor ${item.is_editable ? "" : "block-click"}"
							title="${__(item.title)}"
						>
							<span class="sidebar-item-icon" item-icon="${item.icon || 'link-url'}">
								${item.public
									? frappe.utils.icon(item.icon || "link-url", "md")
									: `<span class="indicator ${item.indicator_color}"></span>`
								}
							</span>
							<span class="sidebar-item-label">${__(item.title)}</span>
						</a>
						<div class="sidebar-item-control"></div>
					</div>
					<div class="sidebar-child-item nested-container"></div>
				</div>
			`);
		}

		// If not a quick link, use original behavior
		return original_sidebar_item_container.call(this, item);
	};

	// ========================================
	// Override append_item for quick links
	// ========================================
	const original_append_item = frappe.views.Workspace.prototype.append_item;

	frappe.views.Workspace.prototype.append_item = function(item, container) {
		// If it's a quick link, handle specially
		if (item.is_quick_link) {
			const is_current_page = isCurrentQuickLinkPage(item);

			item.selected = is_current_page;
			if (is_current_page) {
				this.current_page = { name: item.title, public: item.public };
			}

			let $item_container = this.sidebar_item_container(item);
			let sidebar_control = $item_container.find(".sidebar-item-control");

			// Add sidebar actions (Edit, Duplicate, Hide, Delete)
			this.add_sidebar_actions(item, sidebar_control);

			let pages = item.public ? this.public_pages : this.private_pages;
			let child_items = pages.filter((page) => page.parent_page == item.title);

			if (child_items.length > 0) {
				let child_container = $item_container.find(".sidebar-child-item");
				child_container.addClass("hidden");
				this.prepare_sidebar(child_items, child_container, $item_container);
			}

			$item_container.appendTo(container);
			this.sidebar_items[item.public ? "public" : "private"][item.title] = $item_container;

			if ($item_container.parent().hasClass("hidden") && is_current_page) {
				$item_container.parent().toggleClass("hidden");
			}

			this.add_drop_icon(item, sidebar_control, $item_container);

			if (child_items.length > 0) {
				$item_container.find(".drop-icon").first().addClass("show-in-edit-mode");
			}

			return;
		}

		// If not a quick link, use original behavior
		return original_append_item.call(this, item, container);
	};

	// ========================================
	// Override show_page to prevent workspace loading for quick links
	// ========================================
	const original_show_page = frappe.views.Workspace.prototype.show_page;

	frappe.views.Workspace.prototype.show_page = function(page) {
		// Find if this page is a quick link
		let pages = page.public ? this.public_pages : this.private_pages;
		let current_page_data = pages.find(p => p.title === page.name);

		if (current_page_data && current_page_data.is_quick_link) {
			// Don't show workspace, redirect to the link
			const { href, target } = buildQuickLinkUrl(current_page_data);

			if (current_page_data.quick_link_type === "URL" && target === "_blank") {
				window.open(href, '_blank');
				// Stay on current page
				return;
			}

			// Navigate to the link
			if (href.startsWith('/app/')) {
				frappe.set_route(href.replace('/app/', ''));
			} else {
				window.location.href = href;
			}

			return;
		}

		// If not a quick link, use original behavior
		return original_show_page.call(this, page);
	};

	// ========================================
	// Override prepare_sorted_sidebar to debug
	// ========================================
	const original_prepare_sorted_sidebar = frappe.views.Workspace.prototype.prepare_sorted_sidebar;

	frappe.views.Workspace.prototype.prepare_sorted_sidebar = function(is_public) {
		console.log("=== PREPARE SORTED SIDEBAR ===");
		console.log("is_public:", is_public);
		console.log("public_pages:", this.public_pages.map(p => ({ title: p.title, is_quick_link: p.is_quick_link })));
		console.log("private_pages:", this.private_pages.map(p => ({ title: p.title, is_quick_link: p.is_quick_link })));

		// Call original
		const result = original_prepare_sorted_sidebar.call(this, is_public);

		console.log("sorted items:", is_public ? this.sorted_public_items : this.sorted_private_items);
		return result;
	};

	// ========================================
	// Override sort_sidebar to debug
	// ========================================
	const original_sort_sidebar = frappe.views.Workspace.prototype.sort_sidebar;

	frappe.views.Workspace.prototype.sort_sidebar = function($sidebar_section, pages) {
		console.log("=== SORT SIDEBAR ===");
		console.log("Pages array:", pages.map(p => ({ title: p.title, is_quick_link: p.is_quick_link })));

		let sorted_items = [];
		Array.from($sidebar_section.find(".sidebar-item-container")).forEach((page, i) => {
			let parent_page = "";

			if (page.closest(".nested-container").classList.contains("sidebar-child-item")) {
				// Use getAttribute instead of attributes array
				parent_page = page.parentElement.parentElement.getAttribute("item-name") || "";
			}

			// Use getAttribute instead of attributes array
			const item_name = page.getAttribute("item-name");
			console.log(`Item ${i}: ${item_name}, parent: ${parent_page}`);

			sorted_items.push({
				title: item_name,
				parent_page: parent_page,
				public: page.getAttribute("item-public"),
			});

			let $drop_icon = $(page).find(".sidebar-item-control .drop-icon").first();
			if ($(page).find(".sidebar-child-item > *").length != 0) {
				$drop_icon.removeClass("hidden");
			} else {
				$drop_icon.addClass("hidden");
			}

			let from_index = pages.findIndex((p) => p.title == item_name);
			console.log(`  Finding '${item_name}' in pages: index=${from_index}`);

			if (from_index === -1) {
				console.warn(`  WARNING: '${item_name}' not found in pages array!`);
				return; // Skip this item
			}

			let element = pages[from_index];
			element.parent_page = parent_page;
			if (from_index != i) {
				pages.splice(from_index, 1);
				pages.splice(i, 0, element);
			}
		});

		console.log("Sorted items result:", sorted_items);
		return sorted_items;
	};

	console.log("Sidebar App: Quick Links extension loaded");
})();
