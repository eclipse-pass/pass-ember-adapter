#! /bin/sh

# Read docker configuration
. .env

# Wait until we get a 200 from Fedora or fail some number of times.

function wait_until_up {
    CMD="curl -I -u admin:moo --write-out %{http_code} --silent -o /dev/stderr ${FEDORA_ADAPTER_BASE}"
    echo "Waiting for response from Fedora via ${CMD}"

    RESULT=0
    max=10
    i=1
    
    until [ ${RESULT} -eq 200 ]
    do
        sleep 2
        
        RESULT=$(${CMD})

        if [ $i -eq $max ]
        then
           echo "Trying again, result was ${RESULT}"
           exit 1
        fi

        i=$((i+1))
        echo "Trying again, result was ${RESULT}"
    done

    echo "OK, fedora is up: ${RESULT}"
}

wait_until_up
