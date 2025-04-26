# Rule Configuration

This guide covers the detailed configuration options for AutoMod rules.

## Rule Types

### 1. SPAM

Detects and prevents message spam based on:

- Message frequency
- Duplicate messages
- Message patterns

**Configuration Options:**

```typescript
{
  type: 'SPAM',
  spamThreshold: 5,      // Messages within window
  spamWindow: 5000,      // Time window in ms
  action: 'MUTE',        // Recommended action
  duration: 5-15         // Recommended mute duration (minutes)
}
```

### 2. TOXICITY

Filters toxic content using keywords and patterns.

**Configuration Options:**

```typescript
{
  type: 'TOXICITY',
  keywords: string[],    // List of prohibited words
  action: 'DELETE',      // Recommended action
  strikeThreshold: 3     // Warnings before escalation
}
```

### 3. LINKS

Controls link sharing with customizable patterns.

**Configuration Options:**

```typescript
{
  type: 'LINKS',
  pattern: string,       // Regex pattern for links
  action: 'DELETE',      // Recommended action
  exemptRoles: string[] // Roles allowed to share links
}
```

### 4. MENTIONS

Prevents mention spam and mass pings.

**Configuration Options:**

```typescript
{
  type: 'MENTIONS',
  mentionLimit: 5,      // Max mentions per message
  action: 'WARN',       // Recommended action
  duration: 5           // Optional mute duration
}
```

### 5. ATTACHMENTS

Controls file attachments based on type/pattern.

**Configuration Options:**

```typescript
{
  type: 'ATTACHMENTS',
  pattern: string,      // File extension pattern
  action: 'DELETE',     // Recommended action
  maxSize?: number     // Optional max file size
}
```

### 6. CUSTOM

Create custom rules with regex patterns.

**Configuration Options:**

```typescript
{
  type: 'CUSTOM',
  pattern: string,      // Custom regex pattern
  action: string,       // Any valid action
  description: string   // Rule description
}
```

## Common Configuration Parameters

### Required Parameters

- `name`: Unique identifier for the rule
- `type`: One of the above rule types
- `action`: Action to take on violation
- `description`: Clear description of the rule

### Optional Parameters

- `duration`: Duration for temporary actions (minutes)
- `strikeThreshold`: Violations before escalation
- `exemptRoles`: Roles that bypass the rule
- `channels`: Specific channels for rule application

## Advanced Configuration

### Pattern Examples

1. **Link Filtering**

```regex
// Allow only Discord and YouTube links
pattern: "(https?:\/\/(?!discord\.gg|youtube\.com).*)"

// Block specific domains
pattern: "https?:\/\/(.*\.)?(badsite\.com|spam\.net)"
```

2. **File Attachments**

```regex
// Allow only images
pattern: ".*\.(jpg|jpeg|png|gif)$"

// Block executable files
pattern: ".*\.(exe|bat|cmd|sh|ps1)$"
```

3. **Custom Patterns**

```regex
// Email addresses
pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"

// Discord invites
pattern: "discord\.gg\/[a-zA-Z0-9]+"
```

### Role-based Configuration

```typescript
// Example rule with role exemptions
{
  name: "no-links",
  type: "LINKS",
  exemptRoles: [
    "MODERATOR_ROLE_ID",
    "TRUSTED_ROLE_ID"
  ],
  channels: [
    "GENERAL_CHANNEL_ID",
    "DISCUSSION_CHANNEL_ID"
  ]
}
```

## Best Practices

1. **Pattern Testing**

   - Test patterns in a development environment
   - Use regex testing tools for validation
   - Start with strict patterns and loosen as needed

2. **Performance Considerations**

   - Keep patterns simple and efficient
   - Avoid excessive backtracking in regex
   - Use appropriate rule types for the task

3. **Maintenance**

   - Review and update rules regularly
   - Monitor false positives/negatives
   - Keep documentation updated

4. **Security**
   - Regularly audit exempt roles
   - Monitor rule bypass attempts
   - Log all rule modifications

## Troubleshooting

Common issues and solutions:

1. **Rule Not Triggering**

   - Check rule enabled status
   - Verify pattern syntax
   - Confirm channel/role configuration

2. **False Positives**

   - Refine pattern matching
   - Adjust thresholds
   - Review exemption lists

3. **Performance Issues**
   - Simplify complex patterns
   - Reduce rule overlap
   - Optimize trigger conditions
