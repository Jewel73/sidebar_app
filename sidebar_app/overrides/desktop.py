"""
Override frappe.desk.desktop.get_workspace_sidebar_items
to include custom quick link fields
"""

import frappe
from frappe.desk.desktop import get_workspace_sidebar_items as _original


@frappe.whitelist()
def get_workspace_sidebar_items():
	"""Extended version that includes quick link custom fields"""

	result = _original()

	# Add custom fields to each page
	for page in result.get("pages", []):
		try:
			workspace_doc = frappe.get_cached_doc("Workspace", page["name"])

			# Add display label
			page["display_label"] = workspace_doc.get("display_label") or ""

			# Add quick link custom fields
			page["is_quick_link"] = workspace_doc.get("is_quick_link") or 0
			page["quick_link_type"] = workspace_doc.get("quick_link_type")
			page["quick_link_to"] = workspace_doc.get("quick_link_to")
			page["quick_link_url"] = workspace_doc.get("quick_link_url")
			page["quick_link_open_new_tab"] = workspace_doc.get("quick_link_open_new_tab") or 0

		except Exception as e:
			frappe.log_error(f"Error loading quick link fields for workspace {page['name']}: {str(e)}")
			continue

	return result
