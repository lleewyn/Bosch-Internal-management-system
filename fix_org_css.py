import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove top border from root node
content = content.replace("border-top: 4px solid var(--bosch-red);", "/* border-top: 4px solid var(--bosch-red); */")

# Fix pale sub-node title
old_subnode_css = ".sub-node .n-title { font-size: 9px; color: var(--text-muted); margin-bottom: 4px; }"
new_subnode_css = ".sub-node .n-title { font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.3; }"
content = content.replace(old_subnode_css, new_subnode_css)

# Fix pale sub-node role
old_subnode_role = ".sub-node .n-role { font-size: 9px; margin-bottom: 6px; }"
new_subnode_role = ".sub-node .n-role { font-size: 10px; color: var(--text-muted); margin-bottom: 6px; }"
content = content.replace(old_subnode_role, new_subnode_role)

# Fix font-size: 6px
content = content.replace('font-size: 6px;', 'font-size: 9px; font-weight: 700;')

# Fix general sub-node badge padding (make them less pale if it's the badge itself)
# Instead of inline changes, let's just use the above since the text was too small.

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed CSS for root-node and sub-nodes")
