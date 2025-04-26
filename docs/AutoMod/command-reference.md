# Command Reference

This document provides a comprehensive reference for all AutoMod commands.

## AutoMod Rule Commands

### `/automod-rule create`

Creates a new auto-moderation rule.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `name` (required): Unique name for the rule
- `type` (required): Rule type
  - `SPAM`: Spam detection
  - `TOXICITY`: Toxic content
  - `LINKS`: Link control
  - `MENTIONS`: Mention limits
  - `ATTACHMENTS`: File control
  - `CUSTOM`: Custom patterns
- `action` (required): Action to take
  - `WARN`: Send warning
  - `DELETE`: Remove message
  - `MUTE`: Timeout user
  - `KICK`: Remove from server
  - `BAN`: Ban user
- `description` (required): Rule description

**Optional Parameters:**

- `pattern`: Regex pattern for matching
- `keywords`: Comma-separated list of keywords
- `duration`: Duration for temporary actions
- `strikes`: Number of violations before escalation

**Example:**

```
/automod-rule create
  name: "no-spam"
  type: SPAM
  action: MUTE
  description: "Prevents message spam"
  duration: 10
```

### `/automod-rule list`

Lists all auto-moderation rules.

**Required Permissions:** `MANAGE_MESSAGES`

**Example:**

```
/automod-rule list
```

### `/automod-rule toggle`

Enables or disables a rule.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `name` (required): Name of the rule to toggle

**Example:**

```
/automod-rule toggle
  name: "no-spam"
```

### `/automod-rule delete`

Deletes an auto-moderation rule.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `name` (required): Name of the rule to delete

**Example:**

```
/automod-rule delete
  name: "no-spam"
```

## Infraction Commands

### `/infraction add`

Adds an infraction to a user.

**Required Permissions:** `MODERATE_MEMBERS`

**Parameters:**

- `target` (required): User to add infraction to
- `type` (required): Type of infraction
  - `WARN`
  - `MUTE`
  - `KICK`
  - `BAN`
- `reason` (required): Reason for infraction
- `duration`: Duration in minutes (for mute/ban)

**Example:**

```
/infraction add
  target: @user
  type: MUTE
  reason: "Spamming in #general"
  duration: 10
```

### `/infraction remove`

Removes an infraction from a user.

**Required Permissions:** `MODERATE_MEMBERS`

**Parameters:**

- `target` (required): User to remove infraction from
- `id` (required): ID of the infraction

**Example:**

```
/infraction remove
  target: @user
  id: "infraction-id"
```

### `/infraction list`

Lists infractions for a user.

**Required Permissions:** `MODERATE_MEMBERS`

**Parameters:**

- `target` (required): User to list infractions for
- `active_only`: Show only active infractions

**Example:**

```
/infraction list
  target: @user
  active_only: true
```

## Statistics Commands

### `/modstats overview`

Shows overview of moderation statistics.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `days` (required): Number of days to look back
  - Min: 1
  - Max: 30

**Example:**

```
/modstats overview
  days: 7
```

### `/modstats user`

Shows statistics for a specific user.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `target` (required): User to check

**Example:**

```
/modstats user
  target: @user
```

### `/modstats rules`

Shows statistics for auto-mod rules.

**Required Permissions:** `MANAGE_MESSAGES`

**Parameters:**

- `limit`: Number of top rules to show (default: 5)

**Example:**

```
/modstats rules
  limit: 5
```

## Command Response Format

All commands return responses in Discord embeds with:

- Clear title indicating action
- Color coding for status
  - 🟢 Green: Success
  - 🟡 Yellow: Warning
  - 🔴 Red: Error
- Timestamp of action
- Relevant details in fields

Example Success Response:

```
✅ Auto-Mod Rule Created
Rule "no-spam" has been created
Type: SPAM
Action: MUTE
Description: Prevents message spam
```

Example Error Response:

```
❌ Error
Failed to create rule. The rule name already exists.
```

## Permission Hierarchy

1. Server Administrator

   - Full access to all commands
   - Can manage all rules and infractions

2. Moderators (`MANAGE_MESSAGES`)

   - Can create/edit/delete rules
   - Can view statistics
   - Can manage infractions

3. Regular Users
   - No access to commands
   - Subject to rule enforcement

## Best Practices

1. **Command Usage**

   - Use clear, descriptive rule names
   - Provide detailed reasons for infractions
   - Set appropriate durations
   - Review changes after execution

2. **Permission Management**

   - Regularly audit command access
   - Train staff on proper usage
   - Document custom procedures

3. **Troubleshooting**
   - Check command syntax
   - Verify permissions
   - Review error messages
   - Test in private channels first
