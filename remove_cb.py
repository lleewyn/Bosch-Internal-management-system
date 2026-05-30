 import re

def remove_checkboxes():
    with open('hr.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to remove the th checkbox
    content = re.sub(r'<th[^>]*><input type="checkbox" class="select-all-cb"></th>\n?', '', content)
    
    # Regex to remove the td checkboxes
    content = re.sub(r'<td[^>]*><input type="checkbox" class="row-cb"></td>\n?', '', content)

    with open('hr.html', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    remove_checkboxes()
