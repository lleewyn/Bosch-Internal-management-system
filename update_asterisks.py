import glob, re, os

css_file = 'd:/Aboutme/MyProject/Kientap/css/global.css'
with open(css_file, 'r', encoding='utf-8') as f:
    css = f.read()
if '.required-asterisk' not in css:
    with open(css_file, 'a', encoding='utf-8') as f:
        f.write('\n.required-asterisk { color: #E20015; margin-left: 4px; font-weight: bold; }\n')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(m):
        full_match = m.group(0)
        label_start = m.group(1)
        inner_html = m.group(2)
        label_end = m.group(3)
        
        if '*' in inner_html:
            inner_html = re.sub(r'<span[^>]*>\s*\*\s*</span>', '<span class="required-asterisk">*</span>', inner_html)
            inner_html = re.sub(r'(?<!>)(\*)(?!<)', '<span class="required-asterisk">*</span>', inner_html)
            return label_start + inner_html + label_end
            
        if '<input' in inner_html or 'radio-label' in label_start or 'checkbox-container' in label_start or 'switch' in label_start:
            return full_match
            
        # exclude labels that should not have asterisk
        if 'Trạng thái' in inner_html or 'Email hoặc tên đăng nhập' in inner_html or 'Mật khẩu' in inner_html or 'Tên dự án tự động hiển thị' in inner_html or 'Yêu cầu làm thêm giờ' in inner_html or 'Ghi chú' in inner_html or 'Mô tả' in inner_html:
            return full_match
            
        inner_html = inner_html.rstrip()
        return label_start + inner_html + ' <span class="required-asterisk">*</span>' + label_end

    new_content = re.sub(r'(<label[^>]*>)(.*?)(</label>)', replacer, content, flags=re.IGNORECASE | re.DOTALL)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {os.path.basename(filepath)}')

for f in glob.glob('d:/Aboutme/MyProject/Kientap/*.html'):
    process_file(f)
print('Done')
