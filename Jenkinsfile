pipeline {
    agent any

    triggers {
        // ponytail: cron vide — déclenché par notifyCommit Forgejo, ne polle jamais
        pollSCM('')
    }

    environment {
        REGISTRY = "registry.bluevaloris.com"
        APP_IMAGE = "mind-front-dev"
        SONAR_SERVER = "sonar"
        COOLIFY_WEBHOOK = "https://coolify.bluevaloris.com/api/v1/deploy?uuid=mcvban0oa52fxg9opfxyc8u8&force=false"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Analyse & Build') {
            parallel {
                stage('Code Analysis (SonarQube)') {
                    steps {
                        script {
                            def scannerHome = tool 'SonarScanner'
                            withSonarQubeEnv("${SONAR_SERVER}") {
                                sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=dataset-front"
                            }
                        }
                    }
                }

                stage('Build & Push Image') {
                    steps {
                        script {
                            def shortSha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
                            docker.withRegistry("https://${REGISTRY}", 'docker-registry-creds') {
                                // DOCKER_CONFIG isolé par withRegistry() masque le plugin buildx
                                // (cherché sous $DOCKER_CONFIG/cli-plugins/). Self-heal : réinstaller
                                // le plugin dans ce DOCKER_CONFIG temporaire s'il n'y est pas visible.
                                sh '''
                                    if ! docker buildx version >/dev/null 2>&1; then
                                        echo "docker buildx missing/broken in this DOCKER_CONFIG - installing plugin"
                                        PLUGIN_DIR="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
                                        mkdir -p "$PLUGIN_DIR"
                                        BUILDX_VERSION="v0.19.3"
                                        case "$(uname -m)" in
                                            x86_64)  BUILDX_ARCH="amd64" ;;
                                            aarch64) BUILDX_ARCH="arm64" ;;
                                            *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
                                        esac
                                        curl -fsSL -o "$PLUGIN_DIR/docker-buildx" "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-${BUILDX_ARCH}"
                                        chmod +x "$PLUGIN_DIR/docker-buildx"
                                        docker buildx version
                                    fi
                                '''
                                // Pas de --cache-from : multi-stage Next standalone = risque
                                // d'image hybride (cas creerailleurs 2026-07-21) ; le cache
                                // local buildx de l'agent persistant suffit.
                                sh """
                                    docker buildx build \\
                                        --push \\
                                        -t ${REGISTRY}/${APP_IMAGE}:${shortSha} \\
                                        -t ${REGISTRY}/${APP_IMAGE}:latest \\
                                        .
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy (Coolify)') {
            steps {
                withCredentials([string(credentialsId: 'COOLIFY_TOKEN', variable: 'COOLIFY_API_TOKEN')]) {
                    sh 'curl -sf -w "\\nHTTP Status: %{http_code}\\n" -H "Authorization: Bearer $COOLIFY_API_TOKEN" -X POST "$COOLIFY_WEBHOOK"'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
