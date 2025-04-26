# Getting Started with AutoMod

This guide will help you get started with setting up and using the AutoMod system.

## Prerequisites

To use AutoMod commands, you need one of the following permissions:

- `MANAGE_MESSAGES` - For basic rule management
- `MODERATE_MEMBERS` - For managing infractions
- Server Administrator permissions

## Creating Your First Rule

To create a new AutoMod rule, use the `/automod-rule create` command with the following parameters:

```
/automod-rule create
  name: "no-spam"
  type: SPAM
  action: MUTE
  description: "Prevents message spam"
  duration: 10
```

### Basic Rule Types

1. **Spam Protection**

```
/automod-rule create
  name: "anti-spam"
  type: SPAM
  action: MUTE
  description: "Prevents message spam"
  duration: 10
```

2. **Toxicity Filter**

```
/automod-rule create
  name: "no-toxicity"
  type: TOXICITY
  action: DELETE
  description: "Removes toxic messages"
  keywords: toxic,bad,offensive
```

3. **Link Control**

```
/automod-rule create
  name: "safe-links"
  type: LINKS
  action: DELETE
  description: "Only allows safe links"
  pattern: "(https?:\/\/(?!discord\.gg|discord\.com).*)"
```

## Managing Rules

### Listing Rules

```
/automod-rule list
```

### Toggling Rules

```
/automod-rule toggle
  name: "rule-name"
```

### Deleting Rules

```
/automod-rule delete
  name: "rule-name"
```

## Viewing Infractions

To view a user's infractions:

```
/infraction list
  target: @user
  active_only: false
```

## Best Practices

1. **Start Small**

   - Begin with basic rules and gradually add more
   - Test rules in a private channel first

2. **Rule Naming**

   - Use descriptive names (e.g., "no-spam" instead of "rule1")
   - Include the purpose in the name (e.g., "link-filter-discord")

3. **Action Severity**

   - Match actions to violation severity
   - Use warnings for first offenses
   - Reserve kicks/bans for serious violations

4. **Regular Monitoring**
   - Check rule effectiveness using `/modstats`
   - Adjust rules based on statistics
   - Review false positives regularly

## Next Steps

- Learn about [Rule Configuration](./rule-configuration.md)
- Understand [Actions and Punishments](./actions-and-punishments.md)
- Set up [Statistics and Monitoring](./statistics-and-monitoring.md)
