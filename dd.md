
Nothing below has been exercised at runtime, and nothing has a test:

* Branch preview URLs, from start to finish
* Cancelling a deployment against a live Docker daemon
* Rollback, and the path that gives up on a build after 3 crashes
* The new split build pipeline, the pinned base image, and `CapDrop: ALL`. If a build fails on permissions, suspect `CapDrop: ALL` first.
* The command palette since its crash fix, the project switcher, and the mobile action bar at 375px
* Deployments created before the `branchSlug` migration have `NULL` slugs, so their preview URLs won't work until those rows are filled in.
* In Firefox, env var values show in plain text until toggled.
