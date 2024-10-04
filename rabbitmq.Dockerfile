FROM rabbitmq:management

USER root

RUN mkdir -p /var/lib/rabbitmq && \
    chown -R rabbitmq:rabbitmq /var/lib/rabbitmq && \
    chmod 700 /var/lib/rabbitmq

RUN if [ -f /var/lib/rabbitmq/.erlang.cookie ]; then \
        chmod 600 /var/lib/rabbitmq/.erlang.cookie && \
        chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie; \
    fi

USER rabbitmq