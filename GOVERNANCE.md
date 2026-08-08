# Project Governance

## Ownership and Identity
The `Sye-1321/nestjs-chapa` repository and the `@sye1321/nestjs-chapa` npm package are community-maintained projects. They are not officially endorsed by Chapa.

## Ethiopian Open-Source Stewardship
The project is Ethiopian-led and open to contributors worldwide. Governance, review standards, and release decisions are public and documented here. English is the normative language for project artifacts to ensure broad accessibility.

## Maintainer Model and Decision Authority
For the initial project state, the project operates under a solo-maintainer model:
- **Initial and Sole Maintainer**: Sye (`Sye-1321`)
- **Project/Product Decision Authority**: Sye
- **Merge Authority**: Sye initially.
- **Security-Response Authority**: Sye initially.
- **npm Release Authority**: Sye initially.

## Decision Making
Material architecture, public API, compatibility, security, reliability, dependency, or release-policy decisions not already fixed by the specification must be proposed and accepted via Architecture Decision Records (ADRs). The technical specification remains the normative authority.

## Adding/Removing Maintainers and Succession
As the community grows, additional maintainers may be nominated based on sustained contributions. Additional maintainers require a documented maintainer decision and explicit assignment of responsibilities.

In the event the current sole maintainer must step down, succession will be organized by transferring npm publishing rights and GitHub admin access to a trusted community member. While maintainer succession may be publicly documented, npm/GitHub access transfer details, credentials, or security-sensitive transfer steps must never be handled through public issues.

## Conflict Resolution
Disputes regarding technical decisions or code of conduct violations should be escalated to the maintainer(s). In the solo-maintainer phase, the maintainer's decision is generally final.

However, if a Code of Conduct or governance complaint directly involves the sole maintainer, the sole maintainer must not unilaterally adjudicate their own complaint. In such cases, a temporary independent-review and recusal path will be utilized, involving a trusted, neutral third-party community member for assessment.

## Release Policy
All npm publication, including pre-release and stable releases once release automation exists, must use the approved trusted GitHub Actions publishing workflow rather than ad-hoc local `npm publish`.
