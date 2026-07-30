/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

#include "config.h"
#include "buffer.h"
#include "display.h"
#include "log.h"

#include <cairo/cairo.h>
#include <errno.h>
#include <guacamole/client.h>
#include <limits.h>

#include <stdlib.h>

int guacenc_handle_rect(guacenc_display* display, int argc, char** argv) {
 
    /* Verify argument count */
    if (argc < 5) {
        guacenc_log(GUAC_LOG_WARNING, "\"rect\" instruction incomplete");
        return 1;
    }

    /* Parse arguments */
    char* endptr;
    long index_long;
    long x_long;
    long y_long;
    long width_long;
    long height_long;

    errno = 0;
    index_long = strtol(argv[0], &endptr, 10);
    if (errno != 0 || *endptr != '\0' || index_long < INT_MIN || index_long > INT_MAX)
        return 1;
    int index = (int)index_long;

    errno = 0;
    x_long = strtol(argv[1], &endptr, 10);
    if (errno != 0 || *endptr != '\0' || x_long < INT_MIN || x_long > INT_MAX)
        return 1;
    int x = (int)x_long;

    errno = 0;
    y_long = strtol(argv[2], &endptr, 10);
    if (errno != 0 || *endptr != '\0' || y_long < INT_MIN || y_long > INT_MAX)
        return 1;
    int y = (int)y_long;

    errno = 0;
    width_long = strtol(argv[3], &endptr, 10);
    if (errno != 0 || *endptr != '\0' || width_long < INT_MIN || width_long > INT_MAX)
        return 1;
    int width = (int)width_long;

    errno = 0;
    height_long = strtol(argv[4], &endptr, 10);
    if (errno != 0 || *endptr != '\0' || height_long < INT_MIN || height_long > INT_MAX)
        return 1;
    int height = (int)height_long;

    /* Pull buffer of requested layer/buffer */
    guacenc_buffer* buffer = guacenc_display_get_related_buffer(display, index);
    if (buffer == NULL)
        return 1;

    /* Expand the buffer as necessary to fit the draw operation */
    if (buffer->autosize)
        guacenc_buffer_fit(buffer, x + width, y + height);

    /* Set path to rectangle */
    if (buffer->cairo != NULL)
        cairo_rectangle(buffer->cairo, x, y, width, height);

    return 0;

}

