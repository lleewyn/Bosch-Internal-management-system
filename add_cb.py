import re

def add_checkboxes():
    with open('hr.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add column to colgroup
    content = content.replace('<col style="width: 12%;">', '<col style="width: 5%;">\n                            <col style="width: 10%;">')
    
    # Add checkbox to directoryTable thead
    dir_thead_pattern = r'(<table[^>]*id="directoryTable"[^>]*>[\s\S]*?<thead>\s*<tr>\s*)(<th>)'
    content = re.sub(dir_thead_pattern, r'\1<th style="width: 40px; text-align: center;"><input type="checkbox" class="select-all-cb"></th>\n                                \2', content)

    # Add checkbox to roadmapTable thead
    road_thead_pattern = r'(<table[^>]*id="roadmapTable"[^>]*>[\s\S]*?<thead>\s*<tr>\s*)(<th>)'
    content = re.sub(road_thead_pattern, r'\1<th style="width: 40px; text-align: center;"><input type="checkbox" class="select-all-cb"></th>\n                                \2', content)

    # Add checkbox to tbody rows
    tbody_row_pattern = r'(<tbody>\s*|<tr[^>]*>\s*)(<td class="code-col">)'
    content = re.sub(tbody_row_pattern, r'\1<td style="text-align: center;"><input type="checkbox" class="row-cb"></td>\n                                \2', content)

    with open('hr.html', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    add_checkboxes()
    print("Done")
