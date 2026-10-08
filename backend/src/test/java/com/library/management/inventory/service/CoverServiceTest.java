package com.library.management.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.library.management.common.ApiException;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class CoverServiceTest {
    @TempDir Path directory;
    @Test void detectsRealMagicBytesRatherThanExtension() {
        assertThat(CoverService.detect(new byte[]{(byte)0xff,(byte)0xd8,(byte)0xff,0})).isEqualTo("jpg");
        assertThat(CoverService.detect(new byte[]{(byte)137,80,78,71,13,10,26,10})).isEqualTo("png");
        assertThat(CoverService.detect("RIFF0000WEBP".getBytes())).isEqualTo("webp");
        assertThat(CoverService.detect("<script>".getBytes())).isNull();
    }
    @Test void rejectsOversizeInvalidContentAndPathTraversal() {
        CoverService service=new CoverService(directory.toString());
        assertThatThrownBy(() -> service.upload(new MockMultipartFile("file","image.jpg","image/jpeg",new byte[2*1024*1024+1])))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.upload(new MockMultipartFile("file","image.png","image/png","<script>".getBytes())))
            .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.read("..%2fsecret.jpg")).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.read("../secret.jpg")).isInstanceOf(ApiException.class);
    }
}
