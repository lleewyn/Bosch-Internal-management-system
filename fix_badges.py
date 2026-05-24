import re

with open('css/global.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_badges = """
.badge-leader { background: #fff0f0; color: var(--bosch-red); }
.badge-member { background: #f1f5f9; color: #475569; }
"""

if '.badge-leader' not in css:
    css = css.replace('.badge-info { background: var(--info-bg); color: var(--info-text); }',
                      '.badge-info { background: var(--info-bg); color: var(--info-text); }\n' + new_badges)
    
    with open('css/global.css', 'w', encoding='utf-8') as f:
        f.write(css)

with open('organization.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<div class="badge badge-muted">TEAM LEADER</div>', '<div class="badge badge-leader">TEAM LEADER</div>')
html = html.replace('<div class="badge badge-muted" style="font-size: 9px; font-weight: 700;">KEY MEMBER</div>', '<div class="badge badge-member" style="font-size: 9px; font-weight: 700;">KEY MEMBER</div>')

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated badges to be more professional and fit the palette")
