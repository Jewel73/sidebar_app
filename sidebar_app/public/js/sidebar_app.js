
/**
 * Sidebar App - Custom sidebar navigation
 * Adds Quick Links menu to list views
 */

$(document).on('list_sidebar_setup', function() {
	// Only on ToDo list
	const route = frappe.get_route();
	if (!route || route[0] !== 'List' || route[1] !== 'ToDo') return;

	const $sidebar = $('.list-sidebar');
	if (!$sidebar.length) return;

	// Prevent duplicates
	if ($sidebar.find('.custom-menu').length) return;

	// Create toggle switch
	const $toggleButtons = $(`
		<div class="sidebar-section toggle-section">
			<div class="toggle-switch">
				<button class="toggle-option active" data-target="quick-links">Quick Links</button>
				<button class="toggle-option" data-target="filters">Filters</button>
			</div>
		</div>
	`);

	// Create Quick Links menu with app-style layout
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

	// Insert toggle buttons and menu before Filter By section
	const $filterSection = $sidebar.find('.filter-section');
	const $saveFilterSection = $sidebar.find('.save-filter-section');

	if ($filterSection.length) {
		$toggleButtons.insertBefore($filterSection);
		$menu.insertBefore($filterSection);
		// Hide filters and save filter by default
		$filterSection.hide();
		$saveFilterSection.hide();
	}

	// Toggle functionality
	$toggleButtons.find('.toggle-option').on('click', function(e) {
		e.preventDefault();
		const target = $(this).attr('data-target');

		// Update active button
		$toggleButtons.find('.toggle-option').removeClass('active');
		$(this).addClass('active');

		// Toggle sections
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
