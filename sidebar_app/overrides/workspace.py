import frappe
from frappe import _


@frappe.whitelist()
def update_page(name, title, display_label="", icon="", indicator_color="", parent="", public=0,
                is_quick_link=0, quick_link_type="", quick_link_to="",
                quick_link_workspace="", quick_link_url="", quick_link_open_new_tab=0):
	"""
	Extended version of update_page to support Quick Link fields and Display Label
	"""
	# Call original update_page method
	from frappe.desk.doctype.workspace.workspace import update_page as original_update_page

	# Update basic fields using original method
	result = original_update_page(name, title, icon, indicator_color, parent, public)

	# Update quick link fields and display label
	workspace = frappe.get_doc("Workspace", name)
	workspace.display_label = display_label
	workspace.is_quick_link = int(is_quick_link)
	workspace.quick_link_type = quick_link_type
	workspace.quick_link_to = quick_link_to
	workspace.quick_link_workspace = quick_link_workspace
	workspace.quick_link_url = quick_link_url
	workspace.quick_link_open_new_tab = int(quick_link_open_new_tab)

	workspace.save(ignore_permissions=True)

	return result


@frappe.whitelist()
def duplicate_page(page_name, new_page):
	"""
	Extended version of duplicate_page to support Quick Link fields
	"""
	from frappe.desk.doctype.workspace.workspace import duplicate_page as original_duplicate_page
	import json

	if isinstance(new_page, str):
		new_page = json.loads(new_page)

	# Call original duplicate method
	result = original_duplicate_page(page_name, new_page)

	# Update quick link fields and display label if present
	if result and isinstance(new_page, dict):
		workspace_name = result.get("name")
		if workspace_name:
			workspace = frappe.get_doc("Workspace", workspace_name)
			workspace.display_label = new_page.get("display_label", "")
			workspace.is_quick_link = int(new_page.get("is_quick_link", 0))
			workspace.quick_link_type = new_page.get("quick_link_type", "")
			workspace.quick_link_to = new_page.get("quick_link_to", "")
			workspace.quick_link_workspace = new_page.get("quick_link_workspace", "")
			workspace.quick_link_url = new_page.get("quick_link_url", "")
			workspace.quick_link_open_new_tab = int(new_page.get("quick_link_open_new_tab", 0))

			workspace.save(ignore_permissions=True)

	return result
