# @mission-ui/reference

A sample operational app built only from the kit. It proves the shell, layouts,
and compliance components work together, and it is the target for page-level
accessibility, CSP, and egress tests.

It depends on `ui`, `mission`, and `map` but not `tokens`: apps reach tokens
through the kit stylesheet, never directly (see ADR-0001).

Placeholder until Step 2 (theme switching) and Step 8 (app shell) of
[the build plan](../../docs/build-plan.md).
