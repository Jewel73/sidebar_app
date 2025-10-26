# Sidebar App

Enhanced sidebar functionality for Frappe/ERPNext applications.

## Overview

Sidebar App improves workspace navigation by injecting public workspace menus directly into list and form view sidebars. This allows users to access workspace navigation without leaving their current context.

## Features

- **Workspace Menu Integration**: Public workspace menus appear automatically in list and form sidebars
- **Quick Links Support**: Extended workspace functionality with quick links to DocTypes, Pages, Reports, and URLs
- **Seamless Integration**: Works out of the box with Frappe's existing UI components

  

https://github.com/user-attachments/assets/9f4c8a97-8b05-4e0f-8f80-0cfe28e0281a





## Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/your-repo/sidebar_app --branch develop
bench install-app sidebar_app
```

## Requirements

- Frappe Framework v14 or higher
- ERPNext (optional)

## How It Works

Once installed, the app automatically:

1. Loads public workspaces from your Frappe site
2. Injects workspace menus into list and form view sidebars
3. Enables collapsible navigation for workspace items with children
4. Highlights the currently active page/workspace

## Custom Fields

The app adds the following custom fields to the Workspace DocType:

- `is_quick_link`: Mark workspace as a quick link
- `quick_link_type`: Type of quick link (DocType, Page, Report, Workspace, URL)
- `quick_link_to`: Target DocType/Page/Report name
- `quick_link_workspace`: Target workspace for workspace-type links
- `quick_link_url`: External URL for URL-type links

## Contributing

Contributions are welcome! Please ensure you have `pre-commit` installed:

```bash
cd apps/sidebar_app
pre-commit install
```

This project uses:
- ruff (Python linting)
- eslint (JavaScript linting)
- prettier (code formatting)

## License

MIT
