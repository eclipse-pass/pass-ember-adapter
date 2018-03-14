#! /bin/sh

REPO="$1"

function wait_until_up {
    CMD="curl -u bootstrap:bootstrap --write-out %{http_code} --silent -o /dev/stderr ${REPO}"
    echo "Waiting for response from Fedora via ${CMD}"
    RESULT=$(${CMD})
    until [ ${RESULT} -lt 400 ] && [ ${RESULT} -gt 199 ]
    do
        echo "Trying again, result was ${RESULT}"
        RESULT=$(${CMD})
        sleep 1
    done

    echo "OK, fedora is up: ${RESULT}"
}

wait_until_up
