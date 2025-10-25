
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

	console.log('[sidebar_app] Registering sidebar_item_container override');
	console.log('[sidebar_app] frappe.views.Workspace available:', typeof frappe.views.Workspace);
	console.log('[sidebar_app] Original sidebar_item_container:', typeof frappe.views.Workspace?.prototype?.sidebar_item_container);

	const original_sidebar_item_container = frappe.views.Workspace.prototype.sidebar_item_container;

	frappe.views.Workspace.prototype.sidebar_item_container = function(item) {
		console.log('[sidebar_app] sidebar_item_container called with item:', {
			title: item.title,
			display_label: item.display_label,
			is_quick_link: item.is_quick_link
		});

		// Handle quick links with custom rendering
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
							title="${__(item.display_label || item.title)}"
						>
							<span class="sidebar-item-icon" item-icon="${item.icon || 'link-url'}">
								${item.public
									? frappe.utils.icon(item.icon || "link-url", "md")
									: `<span class="indicator ${item.indicator_color}"></span>`
								}
							</span>
							<span class="sidebar-item-label">${__(item.display_label || item.title)}</span>
						</a>
						<div class="sidebar-item-control"></div>
					</div>
					<div class="sidebar-child-item nested-container"></div>
				</div>
			`);
		}

		// Call original method first
		const $container = original_sidebar_item_container.call(this, item);

		// If display_label exists, update the label text
		if (item.display_label) {
			console.log('[sidebar_app] Updating label from', item.title, 'to', item.display_label);
			const $label = $container.find('.sidebar-item-label');
			console.log('[sidebar_app] Found label element:', $label.length, 'current text:', $label.text());
			$label.text(__(item.display_label));
			$container.find('.item-anchor').attr('title', __(item.display_label));
			console.log('[sidebar_app] Label updated to:', $label.text());
		}

		return $container;
	};

	const original_append_item = frappe.views.Workspace.prototype.append_item;

	frappe.views.Workspace.prototype.append_item = function(item, container) {
		// For quick links, use custom rendering
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

		// For normal workspace items, call original
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

// Override edit_page to add Quick Link fields
frappe.provide("frappe.views.Workspace.prototype");

const original_edit_page = frappe.views.Workspace.prototype.edit_page;

frappe.views.Workspace.prototype.edit_page = function(item) {
	var me = this;
	let old_item = item;
	let parent_pages = this.get_parent_pages(item);
	let idx = parent_pages.findIndex((x) => x == item.title);
	if (idx !== -1) parent_pages.splice(idx, 1);

	const d = new frappe.ui.Dialog({
		title: __("Update Details"),
		fields: [
			{
				label: __("Title"),
				fieldtype: "Data",
				fieldname: "title",
				reqd: 1,
				default: item.title,
				description: __("Unique identifier for this workspace item")
			},
			{
				label: __("Display Label"),
				fieldtype: "Data",
				fieldname: "display_label",
				default: item.display_label || "",
				description: __("Optional: Custom label to show in menus (if empty, Title will be used)")
			},
			{
				label: __("Parent"),
				fieldtype: "Select",
				fieldname: "parent",
				options: parent_pages,
				default: item.parent_page,
			},
			{
				label: __("Public"),
				fieldtype: "Check",
				fieldname: "is_public",
				depends_on: `eval:${this.has_access}`,
				default: item.public,
				onchange: function () {
					d.set_df_property(
						"parent",
						"options",
						this.get_value() ? me.public_parent_pages : me.private_parent_pages
					);
					d.set_df_property("icon", "hidden", this.get_value() ? 0 : 1);
					d.set_df_property("indicator_color", "hidden", this.get_value() ? 1 : 0);
				},
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Icon"),
				fieldtype: "Icon",
				fieldname: "icon",
				default: item.public && item.icon,
				hidden: !item.public,
			},
			{
				label: __("Indicator color"),
				fieldtype: "Select",
				fieldname: "indicator_color",
				options: me.indicator_colors,
				default: !item.public && item.indicator_color,
				hidden: item.public,
			},
			{
				fieldtype: "Section Break",
				label: __("Quick Link Settings"),
			},
			{
				label: __("Is Quick Link"),
				fieldtype: "Check",
				fieldname: "is_quick_link",
				default: item.is_quick_link || 0,
				onchange: function() {
					const is_checked = this.get_value();
					d.set_df_property("quick_link_type", "hidden", !is_checked);
					d.set_df_property("quick_link_to", "hidden", !is_checked);
					d.set_df_property("quick_link_workspace", "hidden", !is_checked);
					d.set_df_property("quick_link_url", "hidden", !is_checked);
					d.set_df_property("quick_link_open_new_tab", "hidden", !is_checked);
				}
			},
			{
				label: __("Link Type"),
				fieldtype: "Select",
				fieldname: "quick_link_type",
				options: ["", "DocType", "Page", "Report", "Workspace", "URL"],
				default: item.quick_link_type || "",
				hidden: !item.is_quick_link,
				onchange: function() {
					const link_type = this.get_value();
					d.set_df_property("quick_link_to", "hidden", !link_type || link_type === "Workspace" || link_type === "URL");
					d.set_df_property("quick_link_workspace", "hidden", link_type !== "Workspace");
					d.set_df_property("quick_link_url", "hidden", link_type !== "URL");
					d.set_df_property("quick_link_open_new_tab", "hidden", link_type !== "URL");

					// Update field label and options based on type
					if (link_type === "DocType") {
						d.set_df_property("quick_link_to", "label", __("DocType"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "DocType");
					} else if (link_type === "Page") {
						d.set_df_property("quick_link_to", "label", __("Page"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "Page");
					} else if (link_type === "Report") {
						d.set_df_property("quick_link_to", "label", __("Report"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "Report");
					}
				}
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Link To"),
				fieldtype: "Link",
				fieldname: "quick_link_to",
				options: item.quick_link_type || "DocType",
				default: item.quick_link_to || "",
				hidden: !item.is_quick_link || !item.quick_link_type || item.quick_link_type === "Workspace" || item.quick_link_type === "URL"
			},
			{
				label: __("Workspace"),
				fieldtype: "Link",
				fieldname: "quick_link_workspace",
				options: "Workspace",
				default: item.quick_link_workspace || "",
				hidden: !item.is_quick_link || item.quick_link_type !== "Workspace"
			},
			{
				label: __("URL"),
				fieldtype: "Data",
				fieldname: "quick_link_url",
				default: item.quick_link_url || "",
				hidden: !item.is_quick_link || item.quick_link_type !== "URL"
			},
			{
				label: __("Open in New Tab"),
				fieldtype: "Check",
				fieldname: "quick_link_open_new_tab",
				default: item.quick_link_open_new_tab || 0,
				hidden: !item.is_quick_link || item.quick_link_type !== "URL"
			}
		],
		primary_action_label: __("Update"),
		primary_action: (values) => {
			values.title = strip_html(values.title);
			let is_title_changed = values.title != old_item.title;
			let is_section_changed = Boolean(values.is_public) != Boolean(old_item.public);
			if (
				(is_title_changed || is_section_changed) &&
				!me.validate_page(values, old_item)
			)
				return;
			d.hide();

			frappe.call({
				method: "sidebar_app.overrides.workspace.update_page",
				args: {
					name: old_item.name,
					title: values.title,
					display_label: values.display_label || "",
					icon: values.icon || "",
					indicator_color: values.indicator_color || "",
					parent: values.parent || "",
					public: values.is_public || 0,
					is_quick_link: values.is_quick_link || 0,
					quick_link_type: values.quick_link_type || "",
					quick_link_to: values.quick_link_to || "",
					quick_link_workspace: values.quick_link_workspace || "",
					quick_link_url: values.quick_link_url || "",
					quick_link_open_new_tab: values.quick_link_open_new_tab || 0
				},
				callback: function (res) {
					if (res.message) {
						let message = __("Workspace {0} Edited Successfully", [
							old_item.title.bold(),
						]);
						frappe.show_alert({ message: message, indicator: "green" });
					}
				},
			});

			// Update local cached values with quick link data
			old_item.display_label = values.display_label || "";
			old_item.is_quick_link = values.is_quick_link || 0;
			old_item.quick_link_type = values.quick_link_type || "";
			old_item.quick_link_to = values.quick_link_to || "";
			old_item.quick_link_workspace = values.quick_link_workspace || "";
			old_item.quick_link_url = values.quick_link_url || "";
			old_item.quick_link_open_new_tab = values.quick_link_open_new_tab || 0;

			me.update_sidebar(old_item, values);

			if (me.make_page_selected) {
				let pre_url = values.is_public ? "" : "private/";
				let route = pre_url + frappe.router.slug(values.title);
				frappe.set_route(route);

				me.make_page_selected = false;
			}

			me.make_sidebar();
			me.show_sidebar_actions();
		},
	});
	d.show();
};

// Override duplicate_page to add Quick Link fields
frappe.views.Workspace.prototype.duplicate_page = function(page) {
	var me = this;
	let new_page = { ...page };
	if (!this.has_access && new_page.public) {
		new_page.public = 0;
	}
	let parent_pages = this.get_parent_pages({ public: new_page.public });
	const d = new frappe.ui.Dialog({
		title: __("Create Duplicate"),
		fields: [
			{
				label: __("Title"),
				fieldtype: "Data",
				fieldname: "title",
				reqd: 1,
				description: __("Unique identifier for this workspace item")
			},
			{
				label: __("Display Label"),
				fieldtype: "Data",
				fieldname: "display_label",
				default: page.display_label || "",
				description: __("Optional: Custom label to show in menus (if empty, Title will be used)")
			},
			{
				label: __("Parent"),
				fieldtype: "Select",
				fieldname: "parent",
				options: parent_pages,
				default: new_page.parent_page,
			},
			{
				label: __("Public"),
				fieldtype: "Check",
				fieldname: "is_public",
				depends_on: `eval:${this.has_access}`,
				default: new_page.public,
				onchange: function () {
					d.set_df_property(
						"parent",
						"options",
						this.get_value() ? me.public_parent_pages : me.private_parent_pages
					);
					d.set_df_property("icon", "hidden", this.get_value() ? 0 : 1);
					d.set_df_property("indicator_color", "hidden", this.get_value() ? 1 : 0);
				},
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Icon"),
				fieldtype: "Icon",
				fieldname: "icon",
				default: new_page.public && new_page.icon,
				hidden: !new_page.public,
			},
			{
				label: __("Indicator color"),
				fieldtype: "Select",
				fieldname: "indicator_color",
				options: this.indicator_colors,
				hidden: new_page.public,
				default: !new_page.public && new_page.indicator_color,
			},
			{
				fieldtype: "Section Break",
				label: __("Quick Link Settings"),
			},
			{
				label: __("Is Quick Link"),
				fieldtype: "Check",
				fieldname: "is_quick_link",
				default: page.is_quick_link || 0,
				onchange: function() {
					const is_checked = this.get_value();
					d.set_df_property("quick_link_type", "hidden", !is_checked);
					d.set_df_property("quick_link_to", "hidden", !is_checked);
					d.set_df_property("quick_link_workspace", "hidden", !is_checked);
					d.set_df_property("quick_link_url", "hidden", !is_checked);
					d.set_df_property("quick_link_open_new_tab", "hidden", !is_checked);
				}
			},
			{
				label: __("Link Type"),
				fieldtype: "Select",
				fieldname: "quick_link_type",
				options: ["", "DocType", "Page", "Report", "Workspace", "URL"],
				default: page.quick_link_type || "",
				hidden: !page.is_quick_link,
				onchange: function() {
					const link_type = this.get_value();
					d.set_df_property("quick_link_to", "hidden", !link_type || link_type === "Workspace" || link_type === "URL");
					d.set_df_property("quick_link_workspace", "hidden", link_type !== "Workspace");
					d.set_df_property("quick_link_url", "hidden", link_type !== "URL");
					d.set_df_property("quick_link_open_new_tab", "hidden", link_type !== "URL");

					// Update field label and options based on type
					if (link_type === "DocType") {
						d.set_df_property("quick_link_to", "label", __("DocType"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "DocType");
					} else if (link_type === "Page") {
						d.set_df_property("quick_link_to", "label", __("Page"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "Page");
					} else if (link_type === "Report") {
						d.set_df_property("quick_link_to", "label", __("Report"));
						d.set_df_property("quick_link_to", "fieldtype", "Link");
						d.set_df_property("quick_link_to", "options", "Report");
					}
				}
			},
			{
				fieldtype: "Column Break",
			},
			{
				label: __("Link To"),
				fieldtype: "Link",
				fieldname: "quick_link_to",
				options: page.quick_link_type || "DocType",
				default: page.quick_link_to || "",
				hidden: !page.is_quick_link || !page.quick_link_type || page.quick_link_type === "Workspace" || page.quick_link_type === "URL"
			},
			{
				label: __("Workspace"),
				fieldtype: "Link",
				fieldname: "quick_link_workspace",
				options: "Workspace",
				default: page.quick_link_workspace || "",
				hidden: !page.is_quick_link || page.quick_link_type !== "Workspace"
			},
			{
				label: __("URL"),
				fieldtype: "Data",
				fieldname: "quick_link_url",
				default: page.quick_link_url || "",
				hidden: !page.is_quick_link || page.quick_link_type !== "URL"
			},
			{
				label: __("Open in New Tab"),
				fieldtype: "Check",
				fieldname: "quick_link_open_new_tab",
				default: page.quick_link_open_new_tab || 0,
				hidden: !page.is_quick_link || page.quick_link_type !== "URL"
			}
		],
		primary_action_label: __("Duplicate"),
		primary_action: (values) => {
			if (!me.validate_page(values)) return;
			d.hide();
			frappe.call({
				method: "sidebar_app.overrides.workspace.duplicate_page",
				args: {
					page_name: page.name,
					new_page: values,
				},
				callback: function (res) {
					if (res.message) {
						let new_page = res.message;
						let message = __(
							"Duplicate of {0} named as {1} is created successfully",
							[page.title.bold(), new_page.title.bold()]
						);
						frappe.show_alert({ message: message, indicator: "green" });
					}
				},
			});

			new_page.title = values.title;
			new_page.display_label = values.display_label || "";
			new_page.public = values.is_public || 0;
			new_page.name = values.title + (new_page.public ? "" : "-" + frappe.session.user);
			new_page.label = new_page.name;
			new_page.icon = values.icon;
			new_page.indicator_color = values.indicator_color;
			new_page.parent_page = values.parent || "";
			new_page.for_user = new_page.public ? "" : frappe.session.user;
			new_page.is_editable = !new_page.public;
			new_page.selected = true;
			new_page.is_quick_link = values.is_quick_link || 0;
			new_page.quick_link_type = values.quick_link_type || "";
			new_page.quick_link_to = values.quick_link_to || "";
			new_page.quick_link_workspace = values.quick_link_workspace || "";
			new_page.quick_link_url = values.quick_link_url || "";
			new_page.quick_link_open_new_tab = values.quick_link_open_new_tab || 0;

			me.update_cached_values(page, new_page, true);

			let pre_url = values.is_public ? "" : "private/";
			let route = pre_url + frappe.router.slug(values.title);
			frappe.set_route(route);

			me.make_sidebar();
			me.show_sidebar_actions();
		},
	});
	d.show();
};
