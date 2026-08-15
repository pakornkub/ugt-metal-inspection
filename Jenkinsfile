// ============================================================================
// Org-standard Jenkins pipeline — 10 stages, adapted for a 3-service repo
// (frontend: Next.js, backend: Express+Prisma, ai-service: FastAPI+Python)
// instead of the usual single-Next.js-app shape.
//
// Checkout → Install → Code Quality (parallel per service)
//   → Unit Tests (frontend+backend, JUnit + coverage) → Build (frontend+backend)
//   → OWASP Dependency Check (90-min timeout + suppression file)
//   → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
//   → Docker Build (docker compose build, all 3 images) → Deploy
// post: emailext (success/unstable/failure/aborted) + cleanWs
//
// No basePath, no Sentry, no separate DB-migrate step — the backend image's
// own CMD runs `prisma db push && prisma db seed` at container start (this
// project uses db push, not migrate; there is no prisma/migrations folder).
// ============================================================================
pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(
            artifactDaysToKeepStr: '7',
            numToKeepStr: '10'
        ))
    }

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        CI                  = 'true'
        SKIP_ENV_VALIDATION = '1'
        // NOTIFY_EMAIL and SMTP_FROM must be set in
        // Manage Jenkins → System → Global properties → Environment variables
    }

    stages {
        // ── 0. Checkout ────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── 1. Install ─────────────────────────────────────────────────────
        stage('Install') {
            steps {
                sh 'cd frontend && npm ci --include=optional'
                sh 'cd backend && npm ci --include=optional && npx prisma generate'
                // ai-service has no host-level install step — its Python deps
                // are installed inside its own Docker image (Docker Build
                // stage) and linted via a throwaway container (below), so no
                // Python runtime is required on the Jenkins agent itself.
            }
        }

        // ── 2. Code Quality (parallel per service) ─────────────────────────
        stage('Code Quality') {
            parallel {
                stage('Frontend') {
                    steps {
                        sh 'cd frontend && npm run lint'
                        sh 'cd frontend && npm run format:check'
                        sh 'cd frontend && npx tsc --noEmit'
                    }
                }
                stage('Backend') {
                    steps {
                        sh 'cd backend && npm run lint'
                        sh 'cd backend && npm run format:check'
                        sh 'cd backend && npx tsc --noEmit'
                    }
                }
                stage('AI Service') {
                    steps {
                        // Throwaway container — no python/ruff install needed
                        // on the Jenkins agent. Config: ai-service/pyproject.toml.
                        sh '''
                            docker run --rm -v "$PWD/ai-service:/app" -w /app python:3.11-slim \
                              sh -c "pip install --quiet ruff && ruff check ."
                        '''
                    }
                }
            }
        }

        // ── 3. Unit Tests ──────────────────────────────────────────────────
        stage('Unit Tests') {
            parallel {
                stage('Frontend') {
                    steps { sh 'cd frontend && npm run test:coverage' }
                }
                stage('Backend') {
                    steps { sh 'cd backend && npm run test:coverage' }
                }
                // ai-service has no test suite yet (predictor.py / main.py are
                // thin wrappers around ultralytics) — add pytest + a stage
                // here if that changes.
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '*/test-results/junit.xml'
                    publishHTML([
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'frontend/coverage',
                        reportFiles          : 'index.html',
                        reportName           : 'Frontend Coverage'
                    ])
                    publishHTML([
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'backend/coverage',
                        reportFiles          : 'index.html',
                        reportName           : 'Backend Coverage'
                    ])
                }
            }
        }

        // ── 4. Build ───────────────────────────────────────────────────────
        stage('Build') {
            steps {
                sh 'cd frontend && npm run build'
                sh 'cd backend && npm run build'
            }
        }

        // ── 5. OWASP Dependency Check ──────────────────────────────────────
        stage('OWASP Dependency Check') {
            options {
                timeout(time: 90, unit: 'MINUTES')
            }
            steps {
                withCredentials([string(credentialsId: 'nvd', variable: 'NVD_API_KEY')]) {
                    sh 'printf "nvd.api.key=%s\\n" "$NVD_API_KEY" > dc-nvd.properties'
                    dependencyCheck(
                        additionalArguments: '''
                            --scan ./
                            --format HTML
                            --format XML
                            --format JSON
                            --out ./dc-report
                            --suppression ./owasp-suppressions.xml
                            --exclude "**/.next/**"
                            --exclude "**/node_modules/**"
                            --exclude "**/coverage/**"
                            --exclude "**/dist/**"
                            --exclude "ai-service/models/**"
                            --propertyfile dc-nvd.properties
                            --noupdate
                        ''',
                        odcInstallation: 'Dependency-Check'
                    )
                }
            }
            post {
                always {
                    sh 'rm -f dc-nvd.properties'
                    dependencyCheckPublisher(
                        pattern: 'dc-report/dependency-check-report.xml',
                        failedTotalCritical: 1,
                        unstableTotalHigh: 1
                    )
                    archiveArtifacts artifacts: 'dc-report/dependency-check-report.*', allowEmptyArchive: true
                }
            }
        }

        // ── 6. SonarQube Analysis ──────────────────────────────────────────
        stage('SonarQube Analysis') {
            steps {
                script {
                    def br        = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())
                    def isProd    = (br == 'main')
                    def sonarKey  = isProd ? 'ugt-metal-inspection'     : 'ugt-metal-inspection-dev'
                    def sonarName = isProd ? 'UGT Metal Inspection System' : 'UGT Metal Inspection System (Dev)'
                    withSonarQubeEnv('SonarQube') {
                        sh "${tool('SonarQube-Scanner')}/bin/sonar-scanner -Dsonar.projectKey=${sonarKey} -Dsonar.projectName='${sonarName}'"
                    }
                }
            }
        }

        // ── 7. Quality Gate ────────────────────────────────────────────────
        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── 8. Docker Build (main + develop only) ──────────────────────────
        stage('Docker Build') {
            when {
                expression {
                    def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())
                    br == 'main' || br == 'develop'
                }
            }
            steps {
                script {
                    def br          = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())
                    def isProd      = (br == 'main')
                    def composeFile = isProd ? 'docker-compose.yml' : 'docker-compose.dev.yml'
                    def buildNum    = env.BUILD_NUMBER
                    // NEXT_PUBLIC_* is inlined into the frontend bundle at
                    // compile time — must be a build arg, resolved per branch.
                    def basePath    = isProd ? '/ugt-metal-inspection'     : '/ugt-metal-inspection-dev'
                    def appUrl      = isProd ? 'https://ugtweb.ube.co.th/ugt-metal-inspection'
                                              : 'https://ugtweb.ube.co.th/ugt-metal-inspection-dev'

                    // TAG makes `image:` in the compose file resolve to a
                    // versioned tag instead of the default `latest`.
                    sh "TAG=${buildNum} NEXT_PUBLIC_BASE_PATH=${basePath} NEXT_PUBLIC_APP_URL=${appUrl} docker compose -f ${composeFile} build"

                    def suffix = isProd ? '' : '-dev'
                    for (svc in ['frontend', 'backend', 'ai']) {
                        sh "docker tag ugt-metal-inspection-${svc}${suffix}:${buildNum} ugt-metal-inspection-${svc}${suffix}:latest"
                    }
                }
            }
        }

        // ── 9. Deploy (main + develop only) ────────────────────────────────
        stage('Deploy') {
            when {
                expression {
                    def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())
                    br == 'main' || br == 'develop'
                }
            }
            steps {
                script {
                    def br            = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())
                    def isProd        = (br == 'main')
                    def envCredId     = isProd ? 'env-ugt-metal-inspection'     : 'env-ugt-metal-inspection-dev'
                    def composeFile   = isProd ? 'docker-compose.yml'           : 'docker-compose.dev.yml'
                    def appdataDir    = isProd ? 'ugt-metal-inspection'         : 'ugt-metal-inspection-dev'
                    def buildNum      = env.BUILD_NUMBER

                    withCredentials([file(credentialsId: envCredId, variable: 'ENV_FILE')]) {
                        sh 'cp $ENV_FILE .env'

                        // No dedicated migrate step: the backend image's CMD
                        // runs `prisma db push && prisma db seed` on every
                        // start, and both are idempotent (see prisma/seed.ts).

                        // [VOLUME] uploads — first-run path prep (idempotent).
                        // SQL Server is external (not a container here), so
                        // there's no [VOLUME]/named-volume prep needed for it.
                        sh """
                          if [ ! -d /srv/appdata/${appdataDir}/uploads ]; then
                            mkdir -p /srv/appdata/${appdataDir}/uploads
                          fi
                        """

                        sh "TAG=${buildNum} docker compose -f ${composeFile} up -d --no-build"

                        // Poll each service's own health status — not wget —
                        // so the result matches each container's HEALTHCHECK.
                        def suffix = isProd ? '' : '-dev'
                        for (svc in ['frontend', 'backend', 'ai']) {
                            def containerName = "ugt-metal-inspection-${svc}${suffix}"
                            sh """
                              echo "Waiting for ${containerName} to become healthy..."
                              for i in \$(seq 1 24); do
                                STATUS=\$(docker inspect --format='{{.State.Health.Status}}' ${containerName} 2>/dev/null || echo "not-found")
                                echo "Attempt \$i/24 — health status: \$STATUS"
                                if [ "\$STATUS" = "healthy" ]; then
                                  echo "${containerName} is healthy!"
                                  break
                                elif [ "\$STATUS" = "unhealthy" ]; then
                                  echo "${containerName} is unhealthy!"
                                  exit 1
                                fi
                                if [ "\$i" = "24" ]; then
                                  echo "${containerName} did not become healthy within 4 minutes (last status: \$STATUS)"
                                  exit 1
                                fi
                                sleep 10
                              done
                            """
                        }
                    }
                }
            }
        }
    }

    // ── Notifications & Cleanup ────────────────────────────────────────────
    post {
        success {
            emailext(
                subject: "[Jenkins] SUCCESS: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    <h2>Pipeline Success Notification</h2>
                    <p><strong>Pipeline:</strong> ${env.JOB_NAME}</p>
                    <p><strong>Build Number:</strong> ${env.BUILD_NUMBER}</p>
                    <p><strong>Status:</strong> <span style="color:green;">SUCCESS</span></p>
                    <p><strong>Branch:</strong> ${env.BRANCH_NAME ?: env.GIT_BRANCH}</p>
                    <p><strong>Details:</strong> All stages passed. Docker images deployed.</p>
                    <p><a href="${env.BUILD_URL}">View Build Details</a></p>
                """,
                to: "${NOTIFY_EMAIL}",
                from: "Jenkins CI <${env.SMTP_FROM}>",
                mimeType: 'text/html'
            )
        }
        unstable {
            emailext(
                subject: "[Jenkins] UNSTABLE: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    <h2>Pipeline Unstable Notification</h2>
                    <p><strong>Pipeline:</strong> ${env.JOB_NAME}</p>
                    <p><strong>Build Number:</strong> ${env.BUILD_NUMBER}</p>
                    <p><strong>Status:</strong> <span style="color:orange;">UNSTABLE</span></p>
                    <p><strong>Branch:</strong> ${env.BRANCH_NAME ?: env.GIT_BRANCH}</p>
                    <p><strong>Details:</strong> Pipeline completed with warnings (e.g. HIGH severity vulnerabilities found). Review dc-report.</p>
                    <p><a href="${env.BUILD_URL}">View Build Details</a></p>
                """,
                to: "${NOTIFY_EMAIL}",
                from: "Jenkins CI <${env.SMTP_FROM}>",
                mimeType: 'text/html'
            )
        }
        failure {
            emailext(
                subject: "[Jenkins] FAILURE: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    <h2>Pipeline Failure Notification</h2>
                    <p><strong>Pipeline:</strong> ${env.JOB_NAME}</p>
                    <p><strong>Build Number:</strong> ${env.BUILD_NUMBER}</p>
                    <p><strong>Status:</strong> <span style="color:red;">FAILURE</span></p>
                    <p><strong>Branch:</strong> ${env.BRANCH_NAME ?: env.GIT_BRANCH}</p>
                    <p><strong>Details:</strong> Check the console output for errors.</p>
                    <p><a href="${env.BUILD_URL}">View Build Details</a></p>
                """,
                to: "${NOTIFY_EMAIL}",
                from: "Jenkins CI <${env.SMTP_FROM}>",
                mimeType: 'text/html'
            )
        }
        aborted {
            emailext(
                subject: "[Jenkins] ABORTED: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    <h2>Pipeline Aborted Notification</h2>
                    <p><strong>Pipeline:</strong> ${env.JOB_NAME}</p>
                    <p><strong>Build Number:</strong> ${env.BUILD_NUMBER}</p>
                    <p><strong>Status:</strong> <span style="color:orange;">ABORTED</span></p>
                    <p><strong>Branch:</strong> ${env.BRANCH_NAME ?: env.GIT_BRANCH}</p>
                    <p><strong>Reason:</strong> Aborted due to SonarQube Quality Gate failure, CRITICAL/HIGH vulnerability, or timeout.</p>
                    <p><a href="${env.BUILD_URL}">View Build Details</a></p>
                """,
                to: "${NOTIFY_EMAIL}",
                from: "Jenkins CI <${env.SMTP_FROM}>",
                mimeType: 'text/html'
            )
        }
        always {
            cleanWs()
        }
    }
}
