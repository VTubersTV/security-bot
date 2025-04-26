# Statistics and Monitoring

This guide covers the statistical tracking and monitoring capabilities of the AutoMod system.

## Overview Statistics

### Viewing Overall Stats

```typescript
/modstats overview
  days: 7  // View stats for last 7 days
```

This shows:

- Total AutoMod triggers
- Total infractions
- Unique users affected
- Action breakdown

### Sample Output

```
📊 Moderation Statistics Overview
Statistics for the last 7 days
- Total Auto-Mod Triggers: 156
- Total Infractions: 43
- Unique Users: 27
- Action Breakdown:
  WARN: 25
  MUTE: 12
  DELETE: 89
  KICK: 4
  BAN: 2
```

## Rule Statistics

### Viewing Rule Performance

```typescript
/modstats rules
  limit: 5  // Show top 5 most triggered rules
```

Provides:

- Trigger count per rule
- Success rate
- Unique users affected
- Most active time periods

### Metrics Tracked

1. **Trigger Metrics**

   - Total triggers
   - Unique triggers
   - False positives
   - Success rate

2. **Time-based Analysis**

   - Hourly distribution
   - Peak activity times
   - Quiet periods
   - Trend analysis

3. **Channel Statistics**
   - Most affected channels
   - Channel-specific patterns
   - Rule effectiveness by channel

## User Statistics

### Individual User Stats

```typescript
/modstats user
  target: @user
```

Shows:

- Total infractions
- Active infractions
- Infraction history
- Action breakdown

### Sample User Stats

```
👤 User Moderation Statistics
Statistics for @username
- Total Infractions: 5
- Active Infractions: 1
- Infraction History:
  WARN: 3
  MUTE: 2
  Active: Muted (15 mins)
```

## Monitoring Tools

### 1. Real-time Monitoring

The system provides:

- Instant violation notifications
- Staff channel alerts
- Action confirmations
- Error reporting

### 2. Performance Monitoring

Track:

- Response times
- Rule processing speed
- System health
- Resource usage

### 3. Accuracy Monitoring

Monitor:

- False positive rates
- False negative rates
- Rule effectiveness
- Pattern accuracy

## Data Analysis

### 1. Trend Analysis

```typescript
// Example data structure
{
  periodStart: Date,
  periodEnd: Date,
  metrics: {
    triggerCount: number,
    uniqueUsers: number,
    successRate: number,
    topChannels: Channel[],
    hourlyDistribution: Distribution[]
  }
}
```

### 2. Channel Analysis

```typescript
// Channel statistics
{
  channelId: string,
  metrics: {
    violations: number,
    uniqueUsers: number,
    mostCommonRules: Rule[],
    peakTimes: TimeSlot[]
  }
}
```

### 3. User Behavior Analysis

```typescript
// User pattern tracking
{
  userId: string,
  patterns: {
    frequentViolations: string[],
    timePatterns: TimePattern[],
    improvementRate: number
  }
}
```

## Reporting Features

### 1. Daily Reports

- Violation summary
- Action summary
- Trending issues
- Staff actions

### 2. Weekly Analysis

- Rule effectiveness
- Pattern adjustments
- User trends
- System performance

### 3. Monthly Reviews

- Long-term trends
- Rule optimization
- System improvements
- Policy recommendations

## Best Practices

### 1. Regular Monitoring

- Check stats daily
- Review trends weekly
- Analyze patterns monthly
- Update rules as needed

### 2. Data-Driven Decisions

- Use statistics for rule updates
- Track effectiveness changes
- Monitor user behavior
- Adjust thresholds based on data

### 3. Performance Optimization

- Monitor response times
- Track resource usage
- Optimize heavy rules
- Balance coverage vs performance

## Troubleshooting

### Common Issues

1. **Missing Data**

   - Check logging configuration
   - Verify database connectivity
   - Confirm event tracking

2. **Inconsistent Stats**

   - Verify time zones
   - Check data aggregation
   - Confirm counting logic

3. **Performance Issues**
   - Review heavy queries
   - Check indexing
   - Monitor cache usage

## Advanced Features

### 1. Custom Metrics

```typescript
// Define custom tracking
{
  metricName: string,
  calculation: () => number,
  threshold: number,
  alert: boolean
}
```

### 2. Alert Configuration

```typescript
// Alert settings
{
  triggerThreshold: number,
  notificationChannel: string,
  alertType: 'IMMEDIATE' | 'DIGEST',
  recipients: string[]
}
```

### 3. Report Automation

```typescript
// Automated reports
{
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  format: 'EMBED' | 'FILE',
  delivery: 'CHANNEL' | 'DM',
  content: ReportConfig[]
}
```
