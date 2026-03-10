FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    bash \
    git \
    curl \
    python3 \
    python3-pip \
    libgl1 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages numpy opencv-python

RUN npm install -g @gltf-transform/cli

RUN curl -L https://github.com/alicevision/meshroom/releases/download/v2023.3.0/Meshroom-2023.3.0-linux.tar.gz \
    -o /tmp/meshroom.tar.gz && \
    tar -xzf /tmp/meshroom.tar.gz -C /opt && \
    ln -s /opt/Meshroom-2023.3.0/meshroom_batch /usr/local/bin/meshroom_batch && \
    rm /tmp/meshroom.tar.gz

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npx", "ts-node", "src/workers/reconstruction.ts"]