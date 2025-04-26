# VTubers.TV Security Bot

A comprehensive Discord verification system for the VTubers.TV community, featuring web-based verification, advanced security checks, and automated user management.

## Features

- 🔒 **Secure Web-Based Verification**

  - OAuth2 Discord authentication
  - IP quality scoring and threat detection
  - VPN/Proxy/Tor network detection
  - Rate limiting and attempt tracking

- 🛡️ **Advanced Security Measures**

  - Session management and security
  - IP-based threat detection
  - Intelligent rate limiting
  - Automated ban system

- 🌐 **Modern Web Interface**

  - Responsive design with Tailwind CSS
  - Dark mode support
  - Beautiful animations
  - User-friendly error handling

- 🤖 **Discord Integration**
  - Automated role management
  - Welcome message system
  - Staff notification system
  - Verification status tracking

## Prerequisites

- Node.js 18.x or higher
- pnpm package manager
- Discord Bot Token and Application
- IPQualityScore API Key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/VTubersTV/security-bot.git
cd security-bot
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file based on `.env.example`:

```env
# ======================================
# Discord Bot Configuration
# ======================================

DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=your_guild_id_here

# ======================================
# Bot Environment Settings
# ======================================

NODE_ENV=development   # Valid options: development, production

# ======================================
# Discord Server Settings
# ======================================

DISCORD_VERIFY_ROLE_ID=role_id_here
DISCORD_WELCOME_CHANNEL_ID=channel_id_here
DISCORD_STAFF_CHAT_CHANNEL_ID=channel_id_here

# ======================================
# Web Server Settings
# ======================================

WEB_URL=https://yourwebsite.com
SESSION_SECRET=your_secure_session_secret_here
IPQS_API_KEY=your_ipqs_api_key_here

```

4. Build the project:

```bash
pnpm build
```

5. Start the server:

```bash
pnpm start
```

## Development

For development with hot-reload:

```bash
# Start the TypeScript compiler in watch mode
pnpm build:watch

# Start the development server
pnpm dev

# Build CSS
pnpm build:css
```

## Security Features

### IP Quality Scoring

- Fraud detection
- VPN/Proxy detection
- Bot traffic identification
- Threat level assessment

### Rate Limiting

- Per-IP request limiting
- Verification attempt tracking
- Automatic temporary bans
- Configurable timeouts

### Session Security

- Secure session management
- CSRF protection
- XSS prevention
- HTTP security headers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU Affero General Public License v3 (AGPLv3) and the VTubers.TV Commercial License (VCL) v1.0. See the [LICENSES.md](LICENSES.md) file for more details.

## Support

For support, please join our [Discord server](https://vtubers.tv/discord) and open a ticket in the appropriate channel.
