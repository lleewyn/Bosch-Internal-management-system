import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. UPDATE CSS
css_old = """
        /* Connectors */
        .org-tree li::before, .org-tree li::after {
            content: '';
            position: absolute; top: 0; right: 50%;
            border-top: 1.5px solid #fca5a5;
            width: 50%; height: 20px;
        }
        .org-tree li::after {
            right: auto; left: 50%;
            border-left: 1.5px solid #fca5a5;
        }
        .org-tree li:only-child::after, .org-tree li:only-child::before {
            display: none;
        }
        .org-tree li:only-child { padding-top: 0; }
        .org-tree li:first-child::before, .org-tree li:last-child::after {
            border: 0 none;
        }
        .org-tree li:last-child::before {
            border-right: 1.5px solid #fca5a5;
        }
        .org-tree ul ul::before {
            content: '';
            position: absolute; top: 0; left: 50%;
            border-left: 1.5px solid #fca5a5;
            width: 0; height: 20px;
            transform: translateX(-0.5px);
        }

        /* Sub-teams lines (gray) */
        .gray-lines li::before, .gray-lines li::after { border-top-color: var(--border-main); }
        .gray-lines li::after { border-left-color: var(--border-main); }
        .gray-lines li:last-child::before { border-right-color: var(--border-main); }
        .gray-lines ul::before { border-left-color: var(--border-main); }

        .org-node {
            background: white;
            border: 1px solid var(--border-main);
            border-radius: 8px;
            padding: 20px 16px 16px 16px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            min-width: 160px;
            position: relative;
        }

        .org-node.root-node {
            min-width: 220px;
            border: 1px solid #fca5a5;
            box-shadow: 0 4px 12px rgba(188,0,4,0.08);
        }
"""

css_new = """
        /* Connectors */
        .org-tree li::before, .org-tree li::after {
            content: '';
            position: absolute; top: 0; right: 50%;
            border-top: 2px solid #cbd5e1;
            width: 50%; height: 20px;
        }
        .org-tree li::after {
            right: auto; left: 50%;
            border-left: 2px solid #cbd5e1;
        }
        .org-tree li:only-child::after, .org-tree li:only-child::before {
            display: none;
        }
        .org-tree li:only-child { padding-top: 0; }
        .org-tree li:first-child::before, .org-tree li:last-child::after {
            border: 0 none;
        }
        .org-tree li:last-child::before {
            border-right: 2px solid #cbd5e1;
            border-radius: 0 12px 0 0;
        }
        .org-tree li:first-child::after {
            border-radius: 12px 0 0 0;
        }
        .org-tree ul ul::before {
            content: '';
            position: absolute; top: 0; left: 50%;
            border-left: 2px solid #cbd5e1;
            width: 0; height: 20px;
            transform: translateX(-1px);
        }

        /* Sub-teams lines (gray) */
        .gray-lines li::before, .gray-lines li::after { border-top-color: #cbd5e1; }
        .gray-lines li::after { border-left-color: #cbd5e1; }
        .gray-lines li:last-child::before { border-right-color: #cbd5e1; }
        .gray-lines ul::before { border-left-color: #cbd5e1; }

        .org-node {
            background: white;
            border: 1px solid var(--border-main);
            border-radius: 12px;
            padding: 20px 24px;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            min-width: 180px;
            position: relative;
            transition: all 0.2s ease;
        }
        .org-node:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            border-color: #cbd5e1;
        }

        .org-node.root-node {
            min-width: 240px;
            border: none;
            background: linear-gradient(135deg, #fff 0%, #fff8f8 100%);
            border-top: 4px solid var(--bosch-red);
            box-shadow: 0 8px 24px rgba(188,0,4,0.12);
        }
        .org-node.root-node:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(188,0,4,0.18);
        }
        
        .n-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            margin-bottom: 12px;
            object-fit: cover;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .sub-node .n-avatar {
            width: 36px;
            height: 36px;
            margin-bottom: 8px;
        }
"""
content = content.replace(css_old, css_new)

# 2. Insert avatars before <div class="n-name">
def insert_avatar(match):
    indent = match.group(1)
    name_tag = match.group(2)
    
    # Extract the name content using regex
    name_match = re.search(r'>([^<]+)<', name_tag)
    if not name_match:
        return match.group(0) # if no text, don't change
    name_text = name_match.group(1).strip()
    
    bg = "BC0004" if "TEAM LEADER" in match.string[match.start()-100:match.start()] or "MANAGER" in match.string[match.start()-100:match.start()] else "6c757d"
    avatar_html = f'<img src="https://ui-avatars.com/api/?name={name_text.replace(" ", "+")}&background={bg}&color=fff" class="n-avatar" alt="Avatar">'
    
    return f'{indent}{avatar_html}\n{indent}{name_tag}'

# Find <div class="n-name"...>Name</div>
content = re.sub(r'([ \t]*)(<div class="n-name"[^>]*>.*?</div>)', insert_avatar, content)

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating organization.html")
