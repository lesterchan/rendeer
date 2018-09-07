# Dockerfile extending the generic Node image with application files for a
# single application.
FROM gcr.io/google_appengine/nodejs
LABEL name="rendeer" \
      version="1.2.0" \
      description="When Puppeteer meets Prerender"

RUN apt-get update && apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

RUN /usr/local/bin/install_node '>=10.9'

COPY . /app/

# Add rendeer as a user
RUN groupadd -r rendeer && useradd -r -g rendeer -G audio,video rendeer \
    && mkdir -p /home/rendeer && chown -R rendeer:rendeer /home/rendeer \
    && chown -R rendeer:rendeer /app

# Run rendeer non-privileged
USER rendeer

EXPOSE 8080

RUN npm install --production || \
  ((if [ -f npm-debug.log ]; then \
      cat npm-debug.log; \
    fi) && false)

ENTRYPOINT [ "npm" ]
CMD ["run", "start"]
