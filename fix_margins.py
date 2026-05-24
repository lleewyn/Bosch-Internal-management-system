import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

css_old = """
        .n-title { font-size: 11px; font-weight: 800; color: var(--text-main); margin-bottom: 4px; text-transform: uppercase; }
        .n-name { font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
        .n-role { font-size: 10px; color: var(--text-secondary); margin-bottom: 8px; }
"""

css_new = """
        /* Add margin to first badge */
        .org-node > .badge:first-child { margin-bottom: 16px; }
        
        .n-title { font-size: 11px; font-weight: 800; color: var(--text-main); margin-bottom: 16px; text-transform: uppercase; }
        .n-name { font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px; }
        .n-role { font-size: 10px; color: var(--text-secondary); margin-bottom: 12px; }
"""

content = content.replace(css_old, css_new)

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated margins")
