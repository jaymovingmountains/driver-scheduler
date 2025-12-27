# E-Signature API Research

## Option 1: BoldSign (Recommended)

**Pricing:**
- Enterprise API: $0.75/envelope
- Starts at $30/month, includes 40 envelopes
- Free sandbox for testing (no credit card required)

**Key Features:**
- Embedded signing (sign within your app)
- Embedded requesting
- Webhooks for status updates
- Custom branding
- Audit trail with complete document history
- Multiple signer languages
- Automatic reminders
- Email content customization
- HIPAA compliant
- SOC 2 Type II certified

**Pros:**
- Very affordable compared to DocuSign/HelloSign
- Free sandbox for development
- Embedded signing works well for in-app experience
- Good API documentation
- Webhooks for real-time status updates

**Cons:**
- Requires paid plan for production use

## Option 2: DocuSign

**Pricing:**
- Developer account is free
- Production starts at ~$10/envelope or subscription plans

**Pros:**
- Industry standard
- Excellent documentation
- Wide adoption

**Cons:**
- More expensive
- Complex setup

## Option 3: HelloSign (Dropbox Sign)

**Pricing:**
- API starts at $15/month for 3 signature requests

**Pros:**
- Simple API
- Good documentation

**Cons:**
- Limited free tier
- Owned by Dropbox

## Recommendation

For MML Driver Scheduler, I recommend a **simpler approach** that doesn't require external API costs:

### In-App E-Signature Solution

Instead of using an external e-signature API, we can implement:

1. **Digital signature capture** - Use HTML5 Canvas to capture driver's signature
2. **Agreement display** - Show the full agreement text in the app
3. **Consent checkbox** - "I have read and agree to the terms"
4. **Timestamp and IP logging** - Record when and from where the agreement was signed
5. **PDF generation** - Generate a signed PDF with the signature image
6. **Email delivery** - Send the signed PDF to the driver

This approach:
- Has no per-signature costs
- Works entirely within the app
- Is legally valid for most employment agreements
- Provides audit trail with timestamps

For a simple Independent Contractor Agreement, this in-app solution is sufficient and cost-effective.
