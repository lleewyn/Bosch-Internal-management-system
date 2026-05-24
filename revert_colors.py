import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert background=random to professional colors
# Team Leaders and Managers -> BC0004
# Others -> 6c757d
def fix_avatars(match):
    bg = "6c757d"
    context = match.string[max(0, match.start()-150):match.start()]
    if "MANAGER" in context or "TEAM LEADER" in context:
        bg = "BC0004"
    return f'background={bg}&'

content = re.sub(r'background=random(?:&|&amp;)', fix_avatars, content)
content = re.sub(r'background=BC0004(?:&|&amp;)', fix_avatars, content) # just to re-apply correctly
content = re.sub(r'background=6c757d(?:&|&amp;)', fix_avatars, content)

# 2. Revert badge-info to badge-muted
content = content.replace('class="badge badge-info">TEAM LEADER', 'class="badge badge-muted">TEAM LEADER')

# 3. Revert badge-warning to badge-muted for KEY MEMBER
# The user's script did: 'class="badge badge-warning" style="font-size: 9px; font-weight: 700; color: #d97706;">KEY MEMBER'
content = re.sub(r'class="badge badge-warning"[^>]*>KEY MEMBER', 'class="badge badge-muted" style="font-size: 9px; font-weight: 700;">KEY MEMBER', content)

# 4. Remove .tl-node class and its CSS
content = content.replace('org-node tl-node', 'org-node')
css_to_remove = """
        .org-node.tl-node {
            border-top: 3px solid var(--info-text, #0ea5e9);
        }
"""
content = content.replace(css_to_remove, '')

# Save
with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted to professional colors")
