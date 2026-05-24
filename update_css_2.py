import re

with open('organization.html', 'r', encoding='utf-8') as f:
    content = f.read()

css_old2 = """
        .org-search input {
            width: 100%;
            height: 40px;
            padding: 0 16px 0 40px;
            background: #f1f3f5;
            border: none;
            border-radius: 20px;
            font-size: 13px;
        }

        .org-search i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }
"""
css_new2 = """
        .org-search input {
            width: 100%;
            height: 40px;
            padding: 0 16px 0 40px;
            background: #f8fafd;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            font-size: 13px;
            transition: all 0.2s ease;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }

        .org-search input:focus {
            background: #fff;
            border-color: #cbd5e1;
            box-shadow: 0 0 0 3px rgba(188,0,4,0.1);
            outline: none;
        }

        .org-search i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            transition: color 0.2s ease;
        }
        .org-search input:focus + i, .org-search input:focus ~ i {
            color: var(--bosch-red);
        }
"""
content = content.replace(css_old2, css_new2)

css_old3 = """
        .group-item.active {
            background: #fff8f8;
            border-left-color: var(--bosch-red);
        }
"""
css_new3 = """
        .group-item.active {
            background: #fee2e2;
            border-left-color: var(--bosch-red);
        }
        .group-item.active .group-icon {
            background: white;
            box-shadow: 0 2px 6px rgba(188,0,4,0.1);
        }
"""
content = content.replace(css_old3, css_new3)

with open('organization.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done updating sidebar and header css")
