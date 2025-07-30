#!/usr/bin/env python3
"""
WithRG X Dashboard - QR Code Generator
Generates QR codes for PWA distribution to team members
"""

import qrcode
from qrcode.constants import ERROR_CORRECT_M, ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont
import io
import base64

# App configuration
APP_NAME = "WithRG X Dashboard"
APP_URL = "https://ca9424bc-b8a9-4f90-ac2d-ad982fedb010.preview.emergentagent.com"
APP_DESCRIPTION = "Political Twitter Management Platform"

def generate_basic_qr():
    """Generate basic QR code for the PWA"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(APP_URL)
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="black", back_color="white")
    return img

def generate_branded_qr():
    """Generate branded QR code with logo and styling"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=ERROR_CORRECT_H,  # High correction for logo overlay
        box_size=10,
        border=4,
    )
    qr.add_data(APP_URL)
    qr.make(fit=True)
    
    # Create QR code image
    img = qr.make_image(fill_color="#1e293b", back_color="white").convert('RGB')
    
    # Add logo in center (simple approach)
    # In production, you'd overlay the actual Twitter logo
    logo_size = img.size[0] // 5
    logo_pos = ((img.size[0] - logo_size) // 2, (img.size[1] - logo_size) // 2)
    
    # Create a white square for logo background
    logo_bg = Image.new('RGB', (logo_size, logo_size), 'white')
    draw = ImageDraw.Draw(logo_bg)
    
    # Draw a simple Twitter-like bird shape
    draw.ellipse([logo_size//4, logo_size//3, 3*logo_size//4, 2*logo_size//3], fill="#3b82f6")
    
    # Paste logo onto QR code
    img.paste(logo_bg, logo_pos)
    
    return img

def generate_styled_qr_with_text():
    """Generate QR code with text and branding"""
    # Generate the QR code
    qr_img = generate_branded_qr()
    
    # Create larger canvas for text
    canvas_width = qr_img.size[0] + 100
    canvas_height = qr_img.size[1] + 150
    
    canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
    
    # Paste QR code in center
    qr_pos = ((canvas_width - qr_img.size[0]) // 2, 50)
    canvas.paste(qr_img, qr_pos)
    
    # Add text
    draw = ImageDraw.Draw(canvas)
    
    # Try to use a nice font, fallback to default
    try:
        title_font = ImageFont.truetype("arial.ttf", 24)
        subtitle_font = ImageFont.truetype("arial.ttf", 16)
        info_font = ImageFont.truetype("arial.ttf", 12)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        info_font = ImageFont.load_default()
    
    # Title
    title = APP_NAME
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_pos = ((canvas_width - title_width) // 2, 10)
    draw.text(title_pos, title, fill="#1e293b", font=title_font)
    
    # Subtitle
    subtitle = APP_DESCRIPTION
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_pos = ((canvas_width - subtitle_width) // 2, qr_pos[1] + qr_img.size[1] + 10)
    draw.text(subtitle_pos, subtitle, fill="#64748b", font=subtitle_font)
    
    # Instructions
    instructions = [
        "1. Scan QR code with phone camera",
        "2. Open website in browser", 
        "3. Tap 'Install App' or 'Add to Home Screen'",
        "4. Login with provided credentials"
    ]
    
    y_pos = subtitle_pos[1] + 30
    for instruction in instructions:
        inst_bbox = draw.textbbox((0, 0), instruction, font=info_font)
        inst_width = inst_bbox[2] - inst_bbox[0]
        inst_pos = ((canvas_width - inst_width) // 2, y_pos)
        draw.text(inst_pos, instruction, fill="#374151", font=info_font)
        y_pos += 20
    
    return canvas

def generate_email_qr():
    """Generate compact QR code for email distribution"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(APP_URL)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#3b82f6", back_color="white")
    return img

def qr_to_base64(img):
    """Convert QR code image to base64 string"""
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_str = base64.b64encode(buffer.read()).decode()
    return f"data:image/png;base64,{img_str}"

def generate_text_qr():
    """Generate ASCII art QR code for text-based distribution"""
    qr = qrcode.QRCode(border=1)
    qr.add_data(APP_URL)
    qr.make(fit=True)
    
    # Get the QR code as text
    qr_text = []
    matrix = qr.get_matrix()
    
    for row in matrix:
        line = ""
        for cell in row:
            line += "██" if cell else "  "
        qr_text.append(line)
    
    return "\n".join(qr_text)

def main():
    """Generate all QR code variations"""
    print("🚀 Generating WithRG X Dashboard QR Codes...")
    
    # Generate different QR code styles
    basic_qr = generate_basic_qr()
    branded_qr = generate_branded_qr()
    styled_qr = generate_styled_qr_with_text()
    email_qr = generate_email_qr()
    text_qr = generate_text_qr()
    
    # Save QR codes
    basic_qr.save('/tmp/withrg_basic_qr.png')
    branded_qr.save('/tmp/withrg_branded_qr.png')
    styled_qr.save('/tmp/withrg_styled_qr.png')
    email_qr.save('/tmp/withrg_email_qr.png')
    
    # Generate base64 versions for web use
    basic_b64 = qr_to_base64(basic_qr)
    branded_b64 = qr_to_base64(branded_qr)
    styled_b64 = qr_to_base64(styled_qr)
    email_b64 = qr_to_base64(email_qr)
    
    print("✅ QR Codes generated successfully!")
    print(f"\n📱 App URL: {APP_URL}")
    print(f"🎯 App Name: {APP_NAME}")
    
    print("\n🔗 QR Code Files Generated:")
    print("- Basic QR: /tmp/withrg_basic_qr.png")
    print("- Branded QR: /tmp/withrg_branded_qr.png") 
    print("- Styled QR with Text: /tmp/withrg_styled_qr.png")
    print("- Email QR: /tmp/withrg_email_qr.png")
    
    print("\n📄 Text QR Code (for markdown/text distribution):")
    print(text_qr)
    
    print("\n🌐 Base64 QR Codes (for web embedding):")
    print(f"Basic: {basic_b64[:50]}...")
    print(f"Branded: {branded_b64[:50]}...")
    
    # Generate HTML page with all QR codes
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{APP_NAME} - QR Code Distribution</title>
    <style>
        body {{ font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }}
        .qr-container {{ text-align: center; margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }}
        .qr-container h3 {{ color: #3b82f6; }}
        img {{ max-width: 100%; height: auto; }}
        .url {{ background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }}
    </style>
</head>
<body>
    <h1>📱 {APP_NAME} - QR Code Distribution</h1>
    
    <div class="url">
        <strong>App URL:</strong> {APP_URL}
    </div>
    
    <div class="qr-container">
        <h3>🎯 Styled QR Code (Recommended for Printing)</h3>
        <img src="{styled_b64}" alt="Styled QR Code">
        <p>Perfect for posters, flyers, and physical distribution</p>
    </div>
    
    <div class="qr-container">
        <h3>🔗 Branded QR Code</h3>
        <img src="{branded_b64}" alt="Branded QR Code">
        <p>Professional branded version with logo</p>
    </div>
    
    <div class="qr-container">
        <h3>📧 Email QR Code (Compact)</h3>
        <img src="{email_b64}" alt="Email QR Code">
        <p>Compact version for email signatures and digital distribution</p>
    </div>
    
    <div class="qr-container">
        <h3>⚡ Basic QR Code</h3>
        <img src="{basic_b64}" alt="Basic QR Code">
        <p>Simple version for any use case</p>
    </div>
    
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3>📱 Installation Instructions for Team:</h3>
        <ol>
            <li><strong>Scan QR code</strong> with phone camera or QR scanner app</li>
            <li><strong>Open the website</strong> in mobile browser (Chrome recommended)</li>
            <li><strong>Look for "Install App"</strong> button or browser installation prompt</li>
            <li><strong>Add to Home Screen</strong> - app will install like a native app</li>
            <li><strong>Login</strong> with credentials provided by admin</li>
        </ol>
    </div>
    
    <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3>🎯 Features After Installation:</h3>
        <ul>
            <li>✅ <strong>Works offline</strong> - Access dashboard without internet</li>
            <li>✅ <strong>Home screen icon</strong> - Quick access like native apps</li>
            <li>✅ <strong>Push notifications</strong> - Real-time campaign updates</li>
            <li>✅ <strong>Multi-handle posting</strong> - Manage multiple Twitter accounts</li>
            <li>✅ <strong>Advanced analytics</strong> - Track engagement and performance</li>
            <li>✅ <strong>Team collaboration</strong> - Role-based access control</li>
        </ul>
    </div>
    
    <footer style="text-align: center; color: #666; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px;">
        <p>{APP_NAME} - Political Twitter Management Platform</p>
        <p>Built with PWA Technology | Version 2.0 Enterprise Edition</p>
    </footer>
</body>
</html>
"""
    
    with open('/tmp/withrg_qr_codes.html', 'w') as f:
        f.write(html_content)
    
    print("- HTML Distribution Page: /tmp/withrg_qr_codes.html")
    
    print("\n🎉 QR Code distribution package ready!")
    print("\n💡 Usage Tips:")
    print("- Use Styled QR for printing and physical distribution")
    print("- Use Email QR for digital sharing")
    print("- Share HTML file with team leaders")
    print("- Include installation instructions with every QR code")

if __name__ == "__main__":
    main()