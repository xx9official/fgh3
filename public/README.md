# ZYMO Chat Widget

A professional, modern, and highly customizable customer support chat widget for websites. Built with vanilla JavaScript, featuring responsive design, accessibility compliance, and seamless integration.

## 🚀 Quick Start

Add the widget to your website with a single line of code:

```html
<script src="https://cdn.zymo.chat/widget.js" data-site-id="your-site-id"></script>
```

Replace `your-site-id` with your actual widget code from the ZYMO dashboard.

## 🎨 Customization

### Basic Configuration

```html
<script src="https://cdn.zymo.chat/widget.js" 
        data-site-id="your-site-id"
        data-primary-color="#0099ff"
        data-position="right"
        data-theme="light"
        data-title="Chat with us"></script>
```

### Available Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-site-id` | string | **required** | Your unique site identifier |
| `data-primary-color` | string | `#0099ff` | Brand color (hex format) |
| `data-position` | string | `right` | Widget position (`left` or `right`) |
| `data-theme` | string | `light` | Theme preference (`light` or `dark`) |
| `data-title` | string | `Chat with us` | Header title text |

## ✨ Features

### Core Functionality
- **Real-time messaging** - Instant communication with customers
- **Responsive design** - Works perfectly on all devices
- **Persistent chat history** - Messages saved locally
- **Unread message badges** - Visual notification system
- **Typing indicators** - Shows when support is typing

### User Experience
- **Smooth animations** - Professional transitions and effects
- **Auto-resize input** - Dynamic text area sizing
- **Keyboard navigation** - Full keyboard accessibility
- **Click outside to close** - Intuitive interaction
- **Escape key support** - Quick close functionality

### Accessibility
- **ARIA compliant** - Screen reader friendly
- **Focus management** - Proper tab navigation
- **High contrast support** - Dark theme available
- **Keyboard shortcuts** - Full keyboard support

### Technical
- **Vanilla JavaScript** - No dependencies required
- **Style isolation** - CSS scoped to prevent conflicts
- **Performance optimized** - Lightweight and fast
- **Cross-browser compatible** - Works on all modern browsers

## 🔧 Advanced Configuration

### Multiple Widgets

You can have multiple widgets on the same page with different configurations:

```html
<!-- Support widget -->
<script src="https://cdn.zymo.chat/widget.js" 
        data-site-id="support-site"
        data-primary-color="#0099ff"
        data-title="Customer Support"></script>

<!-- Sales widget -->
<script src="https://cdn.zymo.chat/widget.js" 
        data-site-id="sales-site"
        data-primary-color="#ff6b6b"
        data-title="Sales Team"></script>
```

### Dynamic Configuration

Update widget settings programmatically:

```javascript
// Change widget color
const widget = document.querySelector('#zymo-widget');
widget.style.setProperty('--zymo-primary-color', '#ff6b6b');

// Change theme
widget.className = widget.className.replace(/zymo-theme-\w+/, 'zymo-theme-dark');

// Change position
widget.className = widget.className.replace(/zymo-position-\w+/, 'zymo-position-left');
```

## 🎯 Integration Examples

### React
```jsx
import { useEffect } from 'react';

function ChatWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.zymo.chat/widget.js';
    script.setAttribute('data-site-id', 'your-site-id');
    document.body.appendChild(script);
  }, []);

  return null;
}
```

### Vue.js
```vue
<template>
  <div></div>
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://cdn.zymo.chat/widget.js';
    script.setAttribute('data-site-id', 'your-site-id');
    document.body.appendChild(script);
  }
}
</script>
```

### WordPress
Add to your theme's `footer.php`:

```php
<script src="https://cdn.zymo.chat/widget.js" 
        data-site-id="<?php echo get_option('zymo_site_id'); ?>"
        data-primary-color="<?php echo get_option('zymo_primary_color', '#0099ff'); ?>"
        data-position="<?php echo get_option('zymo_position', 'right'); ?>"></script>
```

### Shopify
Add to your theme's `layout/theme.liquid`:

```liquid
<script src="https://cdn.zymo.chat/widget.js" 
        data-site-id="{{ settings.zymo_site_id }}"
        data-primary-color="{{ settings.zymo_primary_color }}"
        data-position="{{ settings.zymo_position }}"></script>
```

## 📱 Mobile Responsive

The widget automatically adapts to mobile devices:

- **Full-width chat window** on mobile screens
- **Touch-friendly buttons** and interactions
- **Optimized spacing** for small screens
- **Smooth scrolling** on touch devices

## 🎨 Theme Customization

### Light Theme (Default)
- Clean white background
- Subtle shadows and borders
- High contrast text
- Professional appearance

### Dark Theme
- Dark background colors
- Light text for contrast
- Reduced eye strain
- Modern aesthetic

### Custom Colors
Use any hex color for your brand:

```html
<!-- Blue theme -->
data-primary-color="#0099ff"

<!-- Red theme -->
data-primary-color="#ff6b6b"

<!-- Green theme -->
data-primary-color="#4ecdc4"

<!-- Purple theme -->
data-primary-color="#a855f7"
```

## 🔒 Security & Privacy

- **No external dependencies** - Self-contained widget
- **Local storage only** - Chat history stored locally
- **HTTPS required** - Secure communication
- **No tracking** - Privacy-focused design
- **GDPR compliant** - Data protection ready

## 🚀 Performance

- **Lightweight** - ~15KB gzipped
- **Fast loading** - Under 100ms initialization
- **Optimized rendering** - Smooth 60fps animations
- **Minimal DOM impact** - Efficient memory usage
- **Lazy loading** - Resources loaded on demand

## 🛠️ Troubleshooting

### Widget Not Loading
1. Check that `data-site-id` is provided
2. Verify the script URL is accessible
3. Check browser console for errors
4. Ensure HTTPS is used in production

### Styling Conflicts
1. Widget uses scoped CSS to prevent conflicts
2. Custom CSS can override widget styles if needed
3. Use `!important` sparingly for customizations

### Mobile Issues
1. Ensure viewport meta tag is present
2. Check for conflicting touch event handlers
3. Test on actual mobile devices

## 📞 Support

- **Documentation**: [docs.zymo.chat](https://docs.zymo.chat)
- **Support**: [support@zymo.chat](mailto:support@zymo.chat)
- **Website**: [zymo.chat](https://zymo.chat)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the ZYMO Team 