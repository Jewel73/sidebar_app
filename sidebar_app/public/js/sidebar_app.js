
/**
 * Sidebar App - Custom sidebar navigation
 * Adds Quick Links menu to list views and Workspace Quick Links functionality
 */

frappe.provide("frappe.views");

(function() {
	"use strict";

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
				return false;

			default:
				return false;
		}
	}

	const original_sidebar_item_container = frappe.views.Workspace.prototype.sidebar_item_container;

	frappe.views.Workspace.prototype.sidebar_item_container = function(item) {
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

		return original_sidebar_item_container.call(this, item);
	};

	const original_append_item = frappe.views.Workspace.prototype.append_item;

	frappe.views.Workspace.prototype.append_item = function(item, container) {
		if (item.is_quick_link) {
			const is_current_page = isCurrentQuickLinkPage(item);

			item.selected = is_current_page;
			if (is_current_page) {
				this.current_page = { name: item.title, public: item.public };
			}

			let $item_container = this.sidebar_item_container(item);
			let sidebar_control = $item_container.find(".sidebar-item-control");

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

		return original_append_item.call(this, item, container);
	};

	const original_show_page = frappe.views.Workspace.prototype.show_page;

	frappe.views.Workspace.prototype.show_page = function(page) {
		let pages = page.public ? this.public_pages : this.private_pages;
		let current_page_data = pages.find(p => p.title === page.name);

		if (current_page_data && current_page_data.is_quick_link) {
			const { href, target } = buildQuickLinkUrl(current_page_data);

			if (current_page_data.quick_link_type === "URL" && target === "_blank") {
				window.open(href, '_blank');
				return;
			}

			if (href.startsWith('/app/')) {
				frappe.set_route(href.replace('/app/', ''));
			} else {
				window.location.href = href;
			}

			return;
		}

		return original_show_page.call(this, page);
	};

	const original_sort_sidebar = frappe.views.Workspace.prototype.sort_sidebar;

	frappe.views.Workspace.prototype.sort_sidebar = function($sidebar_section, pages) {
		let sorted_items = [];
		Array.from($sidebar_section.find(".sidebar-item-container")).forEach((page, i) => {
			let parent_page = "";

			if (page.closest(".nested-container").classList.contains("sidebar-child-item")) {
				parent_page = page.parentElement.parentElement.getAttribute("item-name") || "";
			}

			const item_name = page.getAttribute("item-name");

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

			if (from_index === -1) {
				return;
			}

			let element = pages[from_index];
			pages.splice(from_index, 1);
			pages.splice(i, 0, element);
		});

		return sorted_items;
	};

})();

$(document).on('list_sidebar_setup', function() {
	const route = frappe.get_route();
	if (!route || route[0] !== 'List' || route[1] !== 'ToDo') return;

	const $sidebar = $('.list-sidebar');
	if (!$sidebar.length) return;

	if ($sidebar.find('.custom-menu').length) return;

	const $toggleButtons = $(`
		<div class="sidebar-section toggle-section">
			<div class="toggle-switch">
				<button class="toggle-option active" data-target="quick-links">Quick Links</button>
				<button class="toggle-option" data-target="filters">Filters</button>
			</div>
		</div>
	`);

	const $menu = $(`
		<div class="sidebar-section custom-menu quick-links-section">
			<div class="app-menu-header">
				<div class="app-logo">
					${frappe.utils.icon('menu', 'md')}
				</div>
				<div class="app-title">Quick Access</div>
			</div>

			<div class="app-menu-body">
				<div class="app-menu-items">
					<a href="/app/user" class="app-menu-item">
						<div class="app-icon">
							${frappe.utils.icon('user', 'md')}
						</div>
						<div class="app-label">Users</div>
					</a>
					<a href="/app/doctype" class="app-menu-item">
						<div class="app-icon">
							${frappe.utils.icon('folder', 'md')}
						</div>
						<div class="app-label">DocTypes</div>
					</a>
					<a href="/app/todo" class="app-menu-item">
						<div class="app-icon">
							${frappe.utils.icon('check', 'md')}
						</div>
						<div class="app-label">All ToDos</div>
					</a>
					<a href="/app/report" class="app-menu-item">
						<div class="app-icon">
							${frappe.utils.icon('small-file', 'md')}
						</div>
						<div class="app-label">Reports</div>
					</a>
				</div>

				<div class="app-menu-footer">
					<a href="/app/user-settings" class="app-footer-item">
						<div class="app-icon">
							${frappe.utils.icon('setting-gear', 'md')}
						</div>
						<div class="app-label">Settings</div>
					</a>
				</div>
			</div>
		</div>
	`);

	const $filterSection = $sidebar.find('.filter-section');
	const $saveFilterSection = $sidebar.find('.save-filter-section');

	if ($filterSection.length) {
		$toggleButtons.insertBefore($filterSection);
		$menu.insertBefore($filterSection);
		$filterSection.hide();
		$saveFilterSection.hide();
	}

	$toggleButtons.find('.toggle-option').on('click', function(e) {
		e.preventDefault();
		const target = $(this).attr('data-target');

		$toggleButtons.find('.toggle-option').removeClass('active');
		$(this).addClass('active');

		if (target === 'quick-links') {
			$menu.css('display', 'flex');
			$filterSection.css('display', 'none');
			$saveFilterSection.css('display', 'none');
		} else {
			$menu.css('display', 'none');
			$filterSection.css('display', 'block');
			$saveFilterSection.css('display', 'block');
		}
	});
});
