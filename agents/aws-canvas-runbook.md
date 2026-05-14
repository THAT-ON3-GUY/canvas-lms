# AWS + Canvas Runbook

## Goal

Stand up a working Canvas LMS development environment on an AWS EC2 instance using
Docker, following Canvas's official setup documentation, and verify it is running
by hitting the login page.

---

## AI Prompts Used (Summary)

AI assistance was used throughout this setup for the following:

- Diagnosing why `docker compose up` containers were running but port 3000 was
  unreachable (missing port mapping in `docker-compose.override.yml`)
- Identifying the correct port mapping syntax for the override file
- Diagnosing the npm cache error during Docker image build and suggesting
  `docker system prune -f` as the fix
- Recommending instance type upgrades when asset compilation crashed the instance
- Interpreting Docker container logs to confirm Canvas was running

**Example prompt used:**
> "Canvas containers are all showing as up but curl to localhost:3000 returns
> connection refused. The web container shows port 80/tcp but no host mapping.
> How do I expose it?"

---

## Learner Lab + EC2 Checklist

- [x] AWS Academy Learner Lab started
- [x] EC2 instance launched — type: **t3.large** (8GB RAM required for asset compilation)
- [x] SSH inbound rule: TCP port 22, source 0.0.0.0/0
- [x] Custom TCP inbound rule: TCP port 3000, source 0.0.0.0/0
- [x] SSH key pair configured in VSCode Remote SSH
- [x] Canvas LMS fork cloned at `/home/ubuntu/canvas-lms`

**Note on instance size:** t3.micro (1GB) and t3.medium (4GB) both crashed during
Canvas asset compilation. t3.large (8GB RAM + 2GB swap = ~10GB available) is the
minimum viable size for this setup.

---

## Dependencies Installed

```bash
# Update package list
sudo apt-get update

# Install Docker
sudo apt install docker.io -y

# Add user to docker group
sudo usermod -aG docker ubuntu && newgrp docker

# Install Docker Compose v2
sudo apt install docker-compose-v2 -y

# Install ACL (required for Canvas permissions setup)
sudo apt install acl -y
```

---

## Canvas LMS Setup: Doc Path Followed

Official doc followed: `doc/docker/README.md` in the Canvas LMS repository.

### Step 1 — Linux permissions (from README)
```bash
setfacl -Rm u:9999:rwX,g:9999:rwX .
setfacl -dRm u:9999:rwX,g:9999:rwX .
sudo addgroup --gid 9999 docker-instructure
sudo usermod -a -G docker-instructure $USER
```

### Step 2 — Run the official setup script
```bash
./script/docker_dev_setup.sh
```

Script prompts answered:
- Dory reverse proxy: **skip** (not needed for EC2 verification)
- Copy config files: **y**
- Reset .env: **n** (keep existing on re-runs)
- Existing database found: **migrate** (preserve existing data on re-runs)

### Step 3 — Add port mapping to override file
Canvas's default config uses dory for routing. Without dory, port 80 inside the
web container is not exposed to the host. Added manually to
`docker-compose.override.yml`:

```yaml
  web:
    <<: *BASE
    ports:
      - "3000:80"
    environment:
      <<: *BASE-ENV
      VIRTUAL_HOST: .canvas.docker
```

### Step 4 — Start containers
```bash
docker compose up -d
```

---

## Verification Commands and Signals

### Check all containers are running
```bash
docker compose ps
```

Expected output — all 6 containers showing `Up`:
```
canvas-lms-githook_installer-1   Up
canvas-lms-jobs-1                Up
canvas-lms-postgres-1            Up
canvas-lms-redis-1               Up
canvas-lms-web-1                 Up
canvas-lms-webpack-1             Up
```

### Check web server is responding
```bash
curl -I http://localhost:3000
```

Expected output:
```
HTTP/1.1 302 Found
Status: 302 Found
location: http://localhost:3000/login
Server: nginx + Phusion Passenger(R)
```

A `302 Found` redirecting to `/login` confirms Canvas is running and redirecting
unauthenticated users to the login page — exactly the correct behavior.

### Visual verification
Opening `http://localhost:3000` in a browser (via VSCode port forwarding) shows
the Canvas LMS login page with username and password fields.

### Key log signals confirming startup
```
web-1  | Passenger core online, PID 13
webpack-1  | [SUCCESS] Generate outputs
webpack-1  | Done in 131.19s.
```

---

## Startup Command (after instance reboot)

After any EC2 reboot, containers must be restarted manually:

```bash
cd /home/ubuntu/canvas-lms
docker compose up -d
```

Wait approximately 3-5 minutes for Rails and webpack to fully boot before
hitting port 3000.

---

## Out of Scope: Feature Implementation

This lab covers environment setup only. The Canvas Text Clipper feature
(Rails model, controller, React tray, SideNav integration) is explicitly out
of scope for this lab and will be implemented in the next lab.

The implementation plan is documented in:
- `agents/tasks/feature-1/implementation-research.md`
- `text_clipper_feature_e6166ad1.plan.md` (Cursor implementation plan)
