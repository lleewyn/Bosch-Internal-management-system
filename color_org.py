import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change badges for Team Leader and Key Member
content = content.replace('class="badge badge-muted">TEAM LEADER', 'class="badge badge-info">TEAM LEADER')
content = content.replace('class="badge badge-muted" style="font-size: 9px; font-weight: 700;">KEY MEMBER', 'class="badge badge-warning" style="font-size: 9px; font-weight: 700; color: #d97706;">KEY MEMBER')

# 2. Change avatar backgrounds from 6c757d to random
# But wait, using 'random' might return the same random color if cached, or different colors each load.
# UI-Avatars 'random' generates a random color based on the name hash, so it's consistent per name! That's perfect.
content = content.replace('background=6c757d', 'background=random')

# 3. Add a subtle top border to the Team Leader node to distinguish it
# We can just target the HTML structure.
# A team leader node usually starts with: <div class="org-node"> \n <div class="badge badge-info">TEAM LEADER</div>
content = content.replace(
    '<div class="org-node">\n                                            <div class="badge badge-info">TEAM LEADER</div>',
    '<div class="org-node tl-node">\n                                            <div class="badge badge-info">TEAM LEADER</div>'
)

# And add the CSS for .tl-node
css_to_add = """
        .org-node.tl-node {
            border-top: 3px solid var(--info-text, #0ea5e9);
        }
"""
# inject css before </style>
content = content.replace('</style>', css_to_add + '</style>')

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added colors to organization.html")
